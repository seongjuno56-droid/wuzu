'use client';

import { useActionState } from 'react';
import { changePasswordAction, type PasswordState } from './actions';
import { errorTextStyle, fieldStyle, labelStyle, primaryButtonStyle } from '@/components/formStyles';

const initial: PasswordState = { error: null };

export default function PasswordForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={labelStyle}>
        현재 비밀번호
        <input name="current" type="password" required autoComplete="current-password" style={fieldStyle} />
      </label>
      <label style={labelStyle}>
        새 비밀번호
        <input name="next" type="password" required minLength={minLength} autoComplete="new-password" style={fieldStyle} />
      </label>
      <label style={labelStyle}>
        새 비밀번호 확인
        <input name="confirm" type="password" required minLength={minLength} autoComplete="new-password" style={fieldStyle} />
      </label>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
        새 비밀번호는 {minLength}자 이상으로 정해 주세요.
      </p>
      {state.error && <p role="alert" style={errorTextStyle}>{state.error}</p>}
      <button type="submit" disabled={pending} style={primaryButtonStyle}>
        {pending ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </button>
    </form>
  );
}
