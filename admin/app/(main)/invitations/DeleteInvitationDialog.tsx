'use client';

import { useActionState, useRef, useState } from 'react';
import { SubmitButton } from '@/components/ConfirmButton';
import { errorTextStyle, fieldStyle } from '@/components/formStyles';
import { REASON_MAX_LENGTH, type ActionResult } from '@/lib/actionResult';

/**
 * 초대장 삭제 확인 창. 되돌릴 수 없으므로 초대장 이름을 그대로 다시 입력해야 삭제 버튼이 눌린다.
 * 서버 액션도 이름을 다시 비교한다. action 은 action.bind(null, id) 로 묶어서 넘긴다.
 */
export default function DeleteInvitationDialog({
  name,
  active,
  action,
}: {
  name: string;
  /** 활성화 중인 초대장이면 레터 안내를 더한다 */
  active: boolean;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  const [state, formAction] = useActionState(
    (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  const matches = typed.trim() === name.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--danger)',
          background: 'transparent',
          color: 'var(--danger)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        삭제
      </button>
      <dialog
        ref={dialog}
        aria-label="초대장 삭제 확인"
        style={{ width: 'min(440px, calc(100vw - 32px))', border: 'none', borderRadius: 'var(--radius-sm)', padding: 20 }}
      >
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ fontSize: 15 }}>초대장을 삭제할까요?</strong>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            초대장과 방명록·참석 응답이 바로 지워지고, 사진·동영상·음악 파일은 삭제 대기열에 들어가 다음 새벽 작업에서 지워집니다.{' '}
            <b style={{ color: 'var(--danger)' }}>되돌릴 수 없습니다.</b> 잠시 가리려면 숨기기를 쓰세요.
          </p>
          {active && (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--danger)', fontWeight: 600 }}>
              활성화 중인 초대장입니다. 하객 링크가 바로 닫히고, 사용한 레터는 환불되지 않습니다.
            </p>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span>
              확인을 위해 이름 <b>{name}</b> 을(를) 그대로 입력하세요
            </span>
            <input
              name="confirmName"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              style={{ ...fieldStyle, fontSize: 13 }}
            />
          </label>
          <textarea
            name="memo"
            required
            maxLength={REASON_MAX_LENGTH}
            rows={2}
            placeholder="사유를 적어 주세요 (작업 기록에 남습니다)"
            aria-label="사유"
            style={{ ...fieldStyle, fontSize: 13, resize: 'vertical' }}
          />
          {state && !state.ok && <p role="alert" style={errorTextStyle}>{state.message}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--divider)',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <fieldset disabled={!matches} style={{ border: 'none', margin: 0, padding: 0, opacity: matches ? 1 : 0.4 }}>
              <SubmitButton danger>삭제</SubmitButton>
            </fieldset>
          </div>
        </form>
      </dialog>
    </>
  );
}
