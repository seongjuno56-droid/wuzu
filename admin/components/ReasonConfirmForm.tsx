'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { REASON_MAX_LENGTH, type ActionResult } from '@/lib/actionResult';
import { SubmitButton } from './ConfirmButton';
import { errorTextStyle, fieldStyle } from './formStyles';

/**
 * 사유를 받고 확인 창을 거쳐 서버 액션을 실행하는 폼.
 * action 은 formData 의 'memo' 로 사유를 받고 ActionResult 를 돌려준다.
 * 대상 id 같은 값은 action.bind(null, id) 로 미리 묶어서 넘긴다.
 */
export default function ReasonConfirmForm({
  message,
  action,
  children,
  danger = false,
  placeholder = '사유를 적어 주세요 (작업 기록에 남습니다)',
}: {
  message: string;
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  danger?: boolean;
  placeholder?: string;
}) {
  const [state, formAction] = useActionState(
    (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}
    >
      <textarea
        name="memo"
        required
        maxLength={REASON_MAX_LENGTH}
        rows={2}
        placeholder={placeholder}
        aria-label="사유"
        style={{ ...fieldStyle, fontSize: 13, resize: 'vertical' }}
      />
      <div>
        <SubmitButton danger={danger}>{children}</SubmitButton>
      </div>
      {state && !state.ok && <p role="alert" style={errorTextStyle}>{state.message}</p>}
    </form>
  );
}
