'use client';

import { useActionState } from 'react';
import { errorTextStyle, fieldStyle, labelStyle } from '@/components/formStyles';
import { SubmitButton } from '@/components/ConfirmButton';
import { createAdminAction } from './actions';

type State =
  | null
  | { ok: false; message: string }
  /** 임시 비밀번호는 방금 입력한 값을 이 화면 상태에만 둔다. 서버는 돌려주지 않고, 새로 고치면 사라진다 */
  | { ok: true; email: string; tempPassword: string };

const inputStyle = { ...fieldStyle, fontSize: 13 };

/** 운영자 추가 폼. 성공하면 임시 비밀번호를 한 번만 보여 준다 */
export default function CreateAdminForm({ minLength }: { minLength: number }) {
  const [state, formAction] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await createAdminAction(formData);
    if (!result.ok) return result;
    return { ok: true, email: result.email, tempPassword: String(formData.get('tempPassword') ?? '') };
  }, null);

  return (
    <div style={{ marginBottom: 24 }}>
      <form action={formAction} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={labelStyle}>
          이름
          <input name="name" required maxLength={50} autoComplete="off" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          이메일
          <input name="email" type="email" required autoComplete="off" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          임시 비밀번호 ({minLength}자 이상)
          <input
            name="tempPassword"
            type="text"
            required
            minLength={minLength}
            autoComplete="off"
            spellCheck={false}
            style={inputStyle}
          />
        </label>
        <div style={{ paddingBottom: 6 }}>
          <SubmitButton danger={false}>운영자 추가</SubmitButton>
        </div>
      </form>
      {state && !state.ok && (
        <p role="alert" style={{ ...errorTextStyle, marginTop: 8 }}>
          {state.message}
        </p>
      )}
      {state?.ok && (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: '12px 14px',
            border: '1px solid var(--divider)',
            borderRadius: 'var(--radius-sm)',
            background: '#F9FAFB',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>{state.email}</strong> 운영자를 추가했어요. 임시 비밀번호:{' '}
          <code style={{ fontSize: 14, fontWeight: 700 }}>{state.tempPassword}</code>
          <br />
          이 안내는 지금 한 번만 보여요. 따로 전달해 주세요. 처음 로그인하면 비밀번호를 바꾸게 됩니다.
        </div>
      )}
    </div>
  );
}
