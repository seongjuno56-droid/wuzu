import { create } from 'zustand';

import type { SignupInput } from '../services/types';

/** 회원가입 단계 사이에서 공유하는 임시 입력값 (저장하지 않음) */
export type SignupDraft = Partial<SignupInput> & {
  termsService?: boolean;
  termsPrivacy?: boolean;
};

interface DraftState {
  draft: SignupDraft;
  patch: (values: SignupDraft) => void;
  reset: () => void;
}

export const useSignupDraft = create<DraftState>()((set) => ({
  draft: {},
  patch: (values) => set((s) => ({ draft: { ...s.draft, ...values } })),
  reset: () => set({ draft: {} }),
}));
