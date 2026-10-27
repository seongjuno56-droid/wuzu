'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';
import { errorTextStyle, fieldStyle, labelStyle, primaryButtonStyle } from '@/components/formStyles';

const initial: LoginState = { error: null };

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={labelStyle}>
        이메일
        <input name="email" type="email" required autoComplete="username" style={fieldStyle} />
      </label>
      <label style={labelStyle}>
        비밀번호
        <input name="password" type="password" required autoComplete="current-password" style={fieldStyle} />
      </label>
      {state.error && <p role="alert" style={errorTextStyle}>{state.error}</p>}
      <button type="submit" disabled={pending} style={primaryButtonStyle}>
        {pending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
