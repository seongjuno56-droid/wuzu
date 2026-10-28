import { router } from 'expo-router';
import { useState } from 'react';

import { authService } from '../../services';
import { useSession } from '../../store/session';
import type { SignupDraft } from '../../store/signupDraft';

/** draft로 가입 → 세션 저장 → 완료 화면 이동 */
export function useCompleteSignup() {
  const setUser = useSession((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (draft: SignupDraft) => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await authService.signup({
        email: draft.email,
        password: draft.password,
        name: draft.name ?? '',
        birth: draft.birth,
        gender: draft.gender,
        phone: draft.phone,
        marketingAgreed: !!draft.marketingAgreed,
        provider: draft.provider ?? 'email',
        providerKey: draft.providerKey,
      });
      setUser(user);
      // draft는 완료 화면에서 비운다 (여기서 비우면 이전 단계의 가드가 로그인으로 튕겨냄)
      router.replace('/auth/signup/done');
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'EMAIL_TAKEN'
          ? '이미 가입된 이메일입니다.'
          : '가입 중 문제가 발생했어요. 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error };
}
