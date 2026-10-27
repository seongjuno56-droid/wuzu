'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton({ children, danger }: { children: ReactNode; danger: boolean }) {
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
 */
export default function ConfirmButton({
  message,
  action,
  children,
  danger = false,
}: {
  message: string;
  action: () => Promise<void>;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      style={{ display: 'inline' }}
    >
      <SubmitButton danger={danger}>{children}</SubmitButton>
    </form>
  );
}
