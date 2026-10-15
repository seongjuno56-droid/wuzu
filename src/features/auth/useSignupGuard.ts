import { router } from 'expo-router';
import { useEffect } from 'react';

import { useSignupDraft } from '../../store/signupDraft';

/**
 * 가입 단계 화면을 URL로 직접 열어 draft가 없으면 로그인으로 돌려보낸다.
 * 진입 시점에만 확인한다 — 가입 완료 후 draft를 비울 때 스택 아래에 남은
 * 가입 화면들이 다시 튕겨내지 않도록.
 */
export function useSignupGuard() {
  const draft = useSignupDraft((s) => s.draft);
  useEffect(() => {
    if (!useSignupDraft.getState().draft.provider) router.replace('/auth/login');
  }, []);
  return draft;
}
