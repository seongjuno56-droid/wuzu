import type { SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { createSupabaseAuthService } from '../supabase/supabaseAuthService';

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `wuzu://${path}`),
}));

const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const NOW = Date.parse('2026-10-29T12:00:00.000Z');
const REDIRECT = 'wuzu://auth/callback';

/** PostgREST 가 돌려주는 profiles 행 모양 (timestamptz 는 마이크로초·+00:00) */
function row(over: Record<string, unknown> = {}) {
  return {
    id: 'a1b2c3',
    login_id: 'ka_abcd1234',
    email: 'me@example.com',
    name: '카카오친구',
    birth: null,
    gender: null,
    phone: null,
    provider: 'kakao',
    marketing_agreed: false,
    status: 'active',
    withdraw_requested_at: null,
    profile_updated_at: null,
    marketing_updated_at: null,
    created_at: '2026-10-29T11:58:00.123456+00:00',
    ...over,
  };
}

/** my_profile 에서 행이 없을 때 PostgREST 는 모든 칸이 null 인 객체를 준다 */
const EMPTY_ROW = Object.fromEntries(Object.keys(row()).map((k) => [k, null]));

function fakeClient() {
  return {
    auth: {
      signInWithOAuth: jest.fn(async () => ({
        data: { provider: 'kakao', url: 'https://x.supabase.co/auth/v1/authorize?provider=kakao' },
        error: null,
      })),
      exchangeCodeForSession: jest.fn(async () => ({ data: { session: {} }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'a1b2c3' } } }, error: null })),
    },
    rpc: jest.fn(async (_fn: string, _args?: object) => ({ data: row() as object | null, error: null as object | null })),
  };
}

let client: ReturnType<typeof fakeClient>;
let svc: ReturnType<typeof createSupabaseAuthService>;
let clearLocalSession: jest.Mock;
beforeEach(() => {
  openAuthSession.mockReset();
  openAuthSession.mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=the-code` });
  client = fakeClient();
  clearLocalSession = jest.fn(async () => {});
  svc = createSupabaseAuthService(client as unknown as SupabaseClient, { now: () => NOW, clearLocalSession });
});

describe('socialLogin', () => {
  it('브라우저를 닫으면 cancelled 이고 코드 교환을 하지 않는다', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'cancelled' });
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('PKCE 로 브라우저를 열고 돌아온 code 를 세션으로 바꾼다', async () => {
    await svc.socialLogin('google');
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    });
    expect(openAuthSession).toHaveBeenCalledWith(
      'https://x.supabase.co/auth/v1/authorize?provider=kakao',
      REDIRECT,
    );
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('the-code');
    expect(client.rpc).toHaveBeenCalledWith('my_profile');
  });

  it('방금 만든 active 프로필 → ok, isNew, User 매핑', async () => {
    client.rpc.mockResolvedValue({ data: row({ birth: '1990-05-05', gender: 'female' }), error: null });
    const r = await svc.socialLogin('kakao');
    expect(r).toEqual({
      ok: true,
      isNew: true,
      user: {
        id: 'a1b2c3',
        email: 'me@example.com',
        name: '카카오친구',
        birth: '1990-05-05',
        gender: 'female',
        provider: 'kakao',
        marketingAgreed: false,
        createdAt: '2026-10-29T11:58:00.123Z',
        loginId: 'ka_abcd1234',
        status: 'active',
      },
    });
  });

  it('10분 넘게 지난 프로필은 isNew 가 아니다', async () => {
    client.rpc.mockResolvedValue({ data: row({ created_at: '2026-10-29T11:49:59+00:00' }), error: null });
    const r = await svc.socialLogin('kakao');
    expect(r.ok && r.isNew).toBe(false);
  });

  it('banned → banned 이고 signOut 한 번', async () => {
    client.rpc.mockResolvedValue({ data: row({ status: 'banned' }), error: null });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'banned' });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('withdrawing → 철회 기한은 신청일 + 30일', async () => {
    client.rpc.mockResolvedValue({
      data: row({ status: 'withdrawing', withdraw_requested_at: '2026-10-20T03:00:00.5+00:00' }),
      error: null,
    });
    expect(await svc.socialLogin('kakao')).toEqual({
      ok: false,
      reason: 'withdrawing',
      userId: 'a1b2c3',
      requestedAt: '2026-10-20T03:00:00.500Z',
      cancelDeadline: '2026-11-19T03:00:00.500Z',
    });
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('rpc 오류 → failed 이고 이 기기 세션만 끊는다', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('프로필이 없으면(모든 칸 null) failed 이고 signOut', async () => {
    client.rpc.mockResolvedValue({ data: EMPTY_ROW, error: null });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('withdrawn 프로필은 failed 이고 signOut', async () => {
    client.rpc.mockResolvedValue({ data: row({ status: 'withdrawn' }), error: null });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('코드 교환 뒤 예외가 나면 failed 이고 반쪽 세션을 끊는다', async () => {
    client.rpc.mockRejectedValue(new Error('network'));
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('코드 교환 전 예외에서는 signOut 하지 않는다', async () => {
    openAuthSession.mockRejectedValue(new Error('no browser'));
    await svc.socialLogin('kakao');
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('정리 signOut 이 error 를 돌려주면 저장된 세션을 직접 지운다', async () => {
    client.rpc.mockResolvedValue({ data: row({ status: 'banned' }), error: null });
    client.auth.signOut.mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError' } } as never);
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'banned' });
    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });

  it('OAuth 시작 오류·코드 교환 오류·code 없는 콜백 → failed', async () => {
    client.auth.signInWithOAuth.mockResolvedValueOnce({ data: null, error: { message: 'x' } } as never);
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });

    client.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: null, error: { message: 'x' } } as never);
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });

    openAuthSession.mockResolvedValueOnce({ type: 'success', url: `${REDIRECT}?error=server_error` });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
  });

  it('공급자 동의 화면에서 거부(access_denied)하면 cancelled', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: `${REDIRECT}?error=access_denied` });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'cancelled' });
  });

  it('예외가 나도 failed', async () => {
    openAuthSession.mockRejectedValue(new Error('no browser'));
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('currentUser', () => {
  it('세션이 없으면 null 이고 rpc 를 부르지 않는다', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    expect(await svc.currentUser()).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it('active 회원을 돌려준다', async () => {
    expect((await svc.currentUser())?.id).toBe('a1b2c3');
  });
  it('정지·탈퇴 완료·프로필 없음은 null', async () => {
    for (const data of [row({ status: 'banned' }), row({ status: 'withdrawn' }), EMPTY_ROW]) {
      client.rpc.mockResolvedValueOnce({ data, error: null });
      expect(await svc.currentUser()).toBeNull();
    }
  });
  it('탈퇴 신청(withdrawing) 회원은 그대로 돌려준다 (로그아웃 판단은 restoreSession)', async () => {
    client.rpc.mockResolvedValue({
      data: row({ status: 'withdrawing', withdraw_requested_at: '2026-10-20T03:00:00+00:00' }),
      error: null,
    });
    expect(await svc.currentUser()).toMatchObject({ id: 'a1b2c3', status: 'withdrawing' });
  });
  it('토큰 재발급이 네트워크 오류면(getSession error) 던진다 — 저장된 회원을 지키도록', async () => {
    const error = Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 });
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error } as never);
    await expect(svc.currentUser()).rejects.toThrow('Failed to fetch');
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it('재발급 토큰이 거절되면(재시도 불가 오류) 세션이 사라진 것이므로 null', async () => {
    const error = Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 });
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error } as never);
    expect(await svc.currentUser()).toBeNull();
  });
  it('rpc 오류는 던진다 (네트워크 오류로 로그아웃시키지 않도록)', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(svc.currentUser()).rejects.toThrow('offline');
  });
});

describe('회원 정보 RPC', () => {
  it('updateAccount 는 update_my_account 를 {p_name, p_birth, p_gender} 로 부른다', async () => {
    client.rpc.mockResolvedValue({ data: row({ name: '새이름', gender: 'male' }), error: null });
    const u = await svc.updateAccount('ignored', { name: '새이름', gender: 'male' });
    expect(client.rpc).toHaveBeenCalledWith('update_my_account', {
      p_name: '새이름',
      p_birth: null,
      p_gender: 'male',
    });
    expect(u).toMatchObject({ name: '새이름', gender: 'male' });
    expect(u.birth).toBeUndefined();
  });
  it('updateProfile 은 세 값을 모두 보낸다 (undefined 는 null = 비우기)', async () => {
    await svc.updateProfile('ignored', { birth: undefined, gender: undefined, marketingAgreed: true });
    expect(client.rpc).toHaveBeenCalledWith('update_my_profile', {
      p_birth: null,
      p_gender: null,
      p_marketing: true,
    });
  });
  it('setMarketing·cancelWithdraw·requestWithdraw', async () => {
    await svc.setMarketing('ignored', false);
    expect(client.rpc).toHaveBeenLastCalledWith('set_my_marketing', { p_agreed: false });
    await svc.cancelWithdraw('ignored');
    expect(client.rpc).toHaveBeenLastCalledWith('cancel_withdraw');
    client.rpc.mockResolvedValueOnce({ data: null, error: null });
    await svc.requestWithdraw('ignored');
    expect(client.rpc).toHaveBeenLastCalledWith('request_withdraw');
  });
  it('RPC 오류 메시지를 그대로 던진다', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'cannot_cancel_withdraw' } });
    await expect(svc.cancelWithdraw('ignored')).rejects.toThrow('cannot_cancel_withdraw');
  });
  it('logout 은 이 기기 세션만 끊는다 (scope: local)', async () => {
    await svc.logout();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
  it('signOut 이 error 를 돌려주면(오프라인 등) 저장된 세션을 직접 지운다', async () => {
    client.auth.signOut.mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError' } } as never);
    await svc.logout();
    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });
  it('signOut 이 던져도 저장된 세션을 직접 지운다', async () => {
    client.auth.signOut.mockRejectedValueOnce(new Error('lock timeout'));
    await svc.logout();
    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });
});
