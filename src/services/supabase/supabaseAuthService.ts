import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { withdrawCancelDeadline } from '../../features/account/rules';
import type { AuthService, SocialLoginResult, User } from '../types';
import { ProfileRow, profileToUser } from './profileMapper';

/** 첫 로그인 직후(추가 정보 모달)로 보는 기간 */
const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

const FAILED: SocialLoginResult = { ok: false, reason: 'failed' };
const CANCELLED: SocialLoginResult = { ok: false, reason: 'cancelled' };

// 웹에서 OAuth 팝업이 돌아왔을 때 창을 닫는다 (네이티브에서는 아무것도 하지 않음)
WebBrowser.maybeCompleteAuthSession();

/**
 * Supabase 인증 (카카오·구글 OAuth, PKCE).
 * 회원 정보는 모두 security definer RPC 로 읽고 고치며, userId 인자는 무시하고 로그인한 본인 기준이다.
 */
export function createSupabaseAuthService(
  client: SupabaseClient,
  opts: {
    now?: () => number;
    /** signOut 이 로컬 세션을 지우지 못했을 때(오프라인 등) 저장된 세션을 직접 지운다 */
    clearLocalSession?: () => Promise<void>;
  } = {},
): AuthService {
  const now = opts.now ?? Date.now;
  const clearLocalSession = opts.clearLocalSession;

  /** RPC 를 부르고 오류면 DB 가 올린 메시지(profile_not_found 등)로 던진다 */
  async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = args === undefined ? await client.rpc(fn) : await client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }

  /** 프로필 행을 돌려주는 RPC → User. 쓸 수 없는 행이면 던진다 */
  async function callUser(fn: string, args?: Record<string, unknown>): Promise<User> {
    const user = profileToUser(await call<ProfileRow | null>(fn, args));
    if (!user) throw new Error('profile_not_found');
    return user;
  }

  /**
   * 세션을 끊고 기기에 남은 세션이 없게 한다. 던지지 않는다.
   * - scope 'local': 이 기기만 (사용자 로그아웃·일시적 실패 정리)
   * - 기본(global): 이 계정의 모든 기기 (정지·탈퇴 완료·프로필 없음 — 다시 쓸 수 없는 계정)
   * auth-js 는 토큰 재발급이 네트워크 오류면 로컬 세션을 지우지 않고 error 만 돌려주므로, 그때는 직접 지운다.
   */
  async function endSession(scope?: 'local') {
    try {
      const { error } = scope ? await client.auth.signOut({ scope }) : await client.auth.signOut();
      if (!error) return;
    } catch {
      // 아래에서 직접 지운다
    }
    try {
      await clearLocalSession?.();
    } catch {
      // 지우기마저 실패하면 앱 다음 시작 때 restoreSession 이 다시 정리한다
    }
  }

  return {
    async socialLogin(provider) {
      /** 코드 교환으로 세션이 생겼는지 (그 뒤 예외면 반쪽 세션을 끊는다) */
      let signedIn = false;
      try {
        const redirectTo = Linking.createURL('auth/callback');
        const { data, error } = await client.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data?.url) return FAILED;

        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type !== 'success') return CANCELLED;

        const params = new URL(res.url).searchParams;
        const code = params.get('code');
        if (!code) return params.get('error') === 'access_denied' ? CANCELLED : FAILED;

        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (exchanged.error) return FAILED;
        signedIn = true;

        const profile = await client.rpc('my_profile');
        if (profile.error) {
          // 일시적 오류일 수 있으니 다른 기기 세션은 두고 이 기기만 정리
          await endSession('local');
          return FAILED;
        }
        const user = profileToUser(profile.data as ProfileRow | null);
        // 프로필 없음·탈퇴 완료(withdrawn)는 로그인할 수 없는 상태
        if (!user) {
          await endSession();
          return FAILED;
        }
        if (user.status === 'banned') {
          await endSession();
          return { ok: false, reason: 'banned' };
        }
        if (user.status === 'withdrawing') {
          const requestedAt = user.withdrawRequestedAt ?? new Date(now()).toISOString();
          return {
            ok: false,
            reason: 'withdrawing',
            userId: user.id,
            requestedAt,
            cancelDeadline: withdrawCancelDeadline(requestedAt),
          };
        }
        const isNew = now() - Date.parse(user.createdAt) < NEW_USER_WINDOW_MS;
        return { ok: true, user, isNew };
      } catch {
        if (signedIn) await endSession('local');
        return FAILED;
      }
    },

    async currentUser() {
      const { data, error } = await client.auth.getSession();
      if (error) {
        // 토큰 재발급이 네트워크 오류: 세션은 기기에 그대로 있다 → 던져서 저장된 회원을 지키게 한다.
        // 그 밖의 오류(재발급 토큰 거절 등)는 auth-js 가 이미 세션을 지웠으므로 로그아웃으로 본다.
        if (error.name === 'AuthRetryableFetchError') throw error;
        return null;
      }
      if (!data.session) return null;
      // 네트워크·RPC 오류는 던진다: 호출하는 쪽이 저장된 회원을 그대로 둘지 정한다
      const user = profileToUser(await call<ProfileRow | null>('my_profile'));
      if (!user || user.status === 'banned') return null;
      return user;
    },

    async logout() {
      // 이 기기에서만 로그아웃 (다른 기기 세션은 그대로)
      await endSession('local');
    },

    async cancelWithdraw() {
      return callUser('cancel_withdraw');
    },

    async updateProfile(_userId, values) {
      // DB 는 p_birth·p_gender 가 null 이면 비우고, p_marketing 이 null 이면 그대로 둔다. 세 값을 모두 보낸다
      return callUser('update_my_profile', {
        p_birth: values.birth ?? null,
        p_gender: values.gender ?? null,
        p_marketing: values.marketingAgreed,
      });
    },

    async updateAccount(_userId, values) {
      return callUser('update_my_account', {
        p_name: values.name,
        p_birth: values.birth ?? null,
        p_gender: values.gender ?? null,
      });
    },

    async setMarketing(_userId, agreed) {
      return callUser('set_my_marketing', { p_agreed: agreed });
    },

    async requestWithdraw() {
      await call('request_withdraw');
    },
  };
}
