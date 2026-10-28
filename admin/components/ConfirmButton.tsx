'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionResult } from '@/lib/actionResult';

export function SubmitButton({ children, danger }: { children: ReactNode; danger: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: danger ? 'none' : '1px solid var(--divider)',
        background: danger ? 'var(--danger)' : 'transparent',
        color: danger ? '#fff' : 'var(--text-primary)',
        fontSize: 13,
        fontWeight: 600,
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/**
 * 확인 창을 띄우고, 확인하면 서버 액션을 실행하는 버튼.
 * 대상 id 같은 값은 action.bind(null, id) 로 미리 묶어서 넘긴다.
 * 액션이 { ok: false, message } 를 돌려주면 버튼 옆에 문구를 보여 준다.
 */
export default function ConfirmButton({
  message,
  action,
  children,
  danger = false,
}: {
  message: string;
  action: () => Promise<ActionResult | void>;
  children: ReactNode;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState(async (): Promise<ActionResult | null> => (await action()) ?? null, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      style={{ display: 'inline' }}
    >
      <SubmitButton danger={danger}>{children}</SubmitButton>
      {state && !state.ok && (
        <span role="alert" style={{ marginLeft: 8, color: 'var(--danger)', fontSize: 13 }}>
          {state.message}
        </span>
      )}
    </form>
  );
}
