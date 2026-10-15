import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '../services/types';

export type PushConsent = 'agreed' | 'declined' | null;

interface SessionState {
  user: User | null;
  pushConsent: PushConsent;
  hydrated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  setPushConsent: (value: Exclude<PushConsent, null>) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      pushConsent: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      setPushConsent: (pushConsent) => set({ pushConsent }),
    }),
    {
      name: 'wuzu.session.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ user, pushConsent }) => ({ user, pushConsent }),
      onRehydrateStorage: () => () => useSession.setState({ hydrated: true }),
    },
  ),
);
