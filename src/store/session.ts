import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthService, User } from '../services/types';

export type PushConsent = 'agreed' | 'declined' | null;

interface SessionState {
  user: User | null;
  pushConsent: PushConsent;
  /** 간편 로그인으로 막 가입해 추가 정보(생년월일·성별·마케팅)를 받아야 함 */
  needsOnboarding: boolean;
  hydrated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  setPushConsent: (value: Exclude<PushConsent, null>) => void;
  setNeedsOnboarding: (value: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      pushConsent: null,
      needsOnboarding: false,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, needsOnboarding: false }),
      setPushConsent: (pushConsent) => set({ pushConsent }),
      setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),
    }),
    {
      name: 'wuzu.session.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ user, pushConsent, needsOnboarding }) => ({ user, pushConsent, needsOnboarding }),
      onRehydrateStorage: () => () => useSession.setState({ hydrated: true }),
    },
  ),
);

/**
 * 앱 시작 때 저장된 세션으로 회원 정보를 새로 읽는다.
 * - 세션이 없거나 쓸 수 없는 계정(null)·탈퇴 신청 계정이면 로그아웃 (탈퇴 철회는 다시 로그인해야 보인다)
 * - 네트워크 오류면 저장된 회원을 그대로 둔다 (오프라인에서 로그아웃시키지 않는다)
 * - 확인하는 사이 회원이 바뀌었으면(그 사이 새로 로그인) 아무것도 하지 않는다
 */
export async function restoreSession(auth: Pick<AuthService, 'currentUser' | 'logout'>): Promise<void> {
  const before = useSession.getState().user;
  let user: User | null;
  try {
    user = await auth.currentUser();
  } catch {
    return;
  }
  if (useSession.getState().user !== before) return;
  if (user && user.status !== 'withdrawing') {
    useSession.getState().setUser(user);
    return;
  }
  useSession.getState().logout();
  try {
    await auth.logout();
  } catch {
    // 남은 세션 정리 실패는 다음 시작 때 다시 시도된다
  }
}
