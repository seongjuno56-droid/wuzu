import { act } from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';

import Login from '../../../app/auth/login';
import { authService } from '../../../services';
import type { SocialLoginResult } from '../../../services/types';
import { useSession } from '../../../store/session';
import { render } from '../../../test/ui';

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

jest.mock('../../../services', () => ({
  usingMockAuth: false,
  authService: {
    socialLogin: jest.fn(),
    currentUser: jest.fn(),
    logout: jest.fn(async () => {}),
    cancelWithdraw: jest.fn(),
    updateProfile: jest.fn(),
    updateAccount: jest.fn(),
    setMarketing: jest.fn(),
    requestWithdraw: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router') as { router: Record<string, jest.Mock> };
const auth = authService as unknown as Record<string, jest.Mock>;

const user = {
  id: 'u1',
  email: null,
  name: '구글회원',
  provider: 'google' as const,
  marketingAgreed: false,
  createdAt: '2026-10-29T00:00:00.000Z',
  status: 'active' as const,
};

/** 비동기 onPress 를 누르고 끝날 때까지 기다린다 */
async function pressAsync(n: ReactTestInstance) {
  let cur: ReactTestInstance | null = n;
  while (cur && typeof cur.props.onPress !== 'function') cur = cur.parent;
  if (!cur) throw new Error('no onPress');
  const target = cur;
  await act(async () => {
    await target.props.onPress();
  });
}

const respond = (result: SocialLoginResult) => auth.socialLogin.mockResolvedValueOnce(result);

beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ user: null, needsOnboarding: false });
});

describe('로그인 화면', () => {
  it('카카오·구글 버튼만 있고 이메일·애플·회원가입·아이디 찾기는 없다', () => {
    const ui = render(<Login />);
    expect(ui.queryText('카카오로 시작하기')).not.toBeNull();
    expect(ui.queryText('Google로 시작하기')).not.toBeNull();
    expect(ui.queryText('Apple')).toBeNull();
    expect(ui.queryText('회원가입')).toBeNull();
    expect(ui.queryText('아이디 찾기')).toBeNull();
    expect(() => ui.getByPlaceholder('이메일')).toThrow();
    expect(() => ui.getByPlaceholder('비밀번호')).toThrow();
  });

  it('구글로 처음 가입하면 추가 정보 안내를 켜고 홈으로 간다', async () => {
    respond({ ok: true, user, isNew: true });
    const ui = render(<Login />);
    await pressAsync(ui.getText('Google로 시작하기'));
    expect(auth.socialLogin).toHaveBeenCalledWith('google');
    expect(useSession.getState().user?.id).toBe('u1');
    expect(useSession.getState().needsOnboarding).toBe(true);
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });

  it('취소하면 모달·이동 없이 버튼을 다시 누를 수 있다', async () => {
    respond({ ok: false, reason: 'cancelled' });
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(ui.queryText('탈퇴 신청 상태인 계정이에요')).toBeNull();
    expect(ui.queryText('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.')).toBeNull();
    respond({ ok: false, reason: 'cancelled' });
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(auth.socialLogin).toHaveBeenCalledTimes(2);
  });

  it('실패하면 다시 시도 안내를 띄운다', async () => {
    respond({ ok: false, reason: 'failed' });
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(ui.queryText('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.')).not.toBeNull();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('제재 계정이면 제재 모달을 띄우고 홈으로 가지 않는다', async () => {
    respond({ ok: false, reason: 'banned' });
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(ui.queryText('해당 계정은 관리자에 의해\n제재된 계정이므로 사용이 불가합니다.')).not.toBeNull();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(useSession.getState().user).toBeNull();
  });

  it('탈퇴 신청 계정이면 철회 모달, 닫으면 로그아웃 한 번', async () => {
    respond({
      ok: false,
      reason: 'withdrawing',
      userId: 'u1',
      requestedAt: '2026-10-20T00:00:00.000Z',
      cancelDeadline: '2026-11-19T00:00:00.000Z',
    });
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(ui.queryText('탈퇴 신청 상태인 계정이에요')).not.toBeNull();
    await pressAsync(ui.getText('닫기'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(ui.queryText('탈퇴 신청 상태인 계정이에요')).toBeNull();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('탈퇴 신청 계정이 철회하면 로그인되어 홈으로 간다', async () => {
    respond({
      ok: false,
      reason: 'withdrawing',
      userId: 'u1',
      requestedAt: '2026-10-20T00:00:00.000Z',
      cancelDeadline: '2026-11-19T00:00:00.000Z',
    });
    auth.cancelWithdraw.mockResolvedValueOnce(user);
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    await pressAsync(ui.getText('탈퇴 철회하기'));
    expect(auth.cancelWithdraw).toHaveBeenCalledWith('u1');
    expect(auth.logout).not.toHaveBeenCalled();
    expect(useSession.getState().user?.id).toBe('u1');
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });

  it('탈퇴 철회가 실패하면 안내하고 모달을 그대로 둔다', async () => {
    respond({
      ok: false,
      reason: 'withdrawing',
      userId: 'u1',
      requestedAt: '2026-10-20T00:00:00.000Z',
      cancelDeadline: '2026-11-19T00:00:00.000Z',
    });
    auth.cancelWithdraw.mockRejectedValueOnce(new Error('offline'));
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    await pressAsync(ui.getText('탈퇴 철회하기'));
    expect(ui.queryText('탈퇴를 철회하지 못했어요. 잠시 후 다시 시도해 주세요.')).not.toBeNull();
    expect(ui.queryText('탈퇴 신청 상태인 계정이에요')).not.toBeNull();
    expect(useSession.getState().user).toBeNull();
    expect(router.dismissTo).not.toHaveBeenCalled();
    // 다시 누를 수 있다
    auth.cancelWithdraw.mockResolvedValueOnce(user);
    await pressAsync(ui.getText('탈퇴 철회하기'));
    expect(useSession.getState().user?.id).toBe('u1');
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });

  it('socialLogin 이 예외를 던져도 실패 안내를 띄운다', async () => {
    auth.socialLogin.mockRejectedValueOnce(new Error('boom'));
    const ui = render(<Login />);
    await pressAsync(ui.getText('카카오로 시작하기'));
    expect(ui.queryText('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.')).not.toBeNull();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
