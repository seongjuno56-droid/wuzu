'use client';

import { useActionState } from 'react';
import { errorTextStyle, fieldStyle, labelStyle, primaryButtonStyle } from '@/components/formStyles';
import { ACCOUNT_NAME_MAX, CONTACT_EMAIL_MAX, DELETION_MESSAGE_MAX } from '@/lib/deletionRequestRules';
import { submitDeletionRequestAction, type DeletionRequestState } from './actions';

const initial: DeletionRequestState = { done: false, error: null };

/** 공개 화면이라 글자를 조금 키운다(16px 이상이면 iOS 가 입력 칸을 확대하지 않는다) */
const field = { ...fieldStyle, fontSize: 16, width: '100%' };
const label = { ...labelStyle, fontSize: 14 };

export default function RequestForm() {
  const [state, action, pending] = useActionState(submitDeletionRequestAction, initial);

  if (state.done) {
    return (
      <div role="status" style={{ padding: '20px 18px', borderRadius: 12, background: '#EEF3F0', lineHeight: 1.6 }}>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand)' }}>
          요청을 받았어요. 7일 안에 처리하고 적어 주신 이메일로 알려 드릴게요.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          We have received your request. We will process it within 7 days and let you know by email.
        </p>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={label}>
        연락 받을 이메일 · Contact email (필수 · required)
        <input name="contactEmail" type="email" required maxLength={CONTACT_EMAIL_MAX} autoComplete="email" style={field} />
      </label>
      <label style={label}>
        로그인 방식 · Sign-in method
        <select name="provider" defaultValue="unknown" style={{ ...field, background: '#fff' }}>
          <option value="kakao">카카오 · Kakao</option>
          <option value="google">구글 · Google</option>
          <option value="unknown">잘 모르겠어요 · Not sure</option>
        </select>
      </label>
      <label style={label}>
        앱 닉네임 · Nickname in the app (선택 · optional)
        <input name="accountName" maxLength={ACCOUNT_NAME_MAX} autoComplete="off" style={field} />
      </label>
      <label style={label}>
        하고 싶은 말 · Message (선택 · optional)
        <textarea name="message" maxLength={DELETION_MESSAGE_MAX} rows={4} style={{ ...field, resize: 'vertical' }} />
      </label>
      {/* 봇 막기용 숨은 칸. 사람은 보지도 채우지도 않는다 */}
      <div aria-hidden="true" style={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && <p role="alert" style={errorTextStyle}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ ...primaryButtonStyle, padding: '14px 12px', fontSize: 16 }}>
        {pending ? '보내는 중… · Sending…' : '삭제 요청 보내기 · Send request'}
      </button>
    </form>
  );
}
