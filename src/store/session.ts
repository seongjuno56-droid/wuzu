import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '../services/types';

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
