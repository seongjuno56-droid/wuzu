import type { PushConsent } from '../../store/session';

/**
 * 마케팅 수신 동의를 바꿀 때 PUSH 알림 상태: 켜면 함께 켜고, 끄면 함께 끈다.
 * (PUSH 만 끌 때는 마케팅 동의를 그대로 둔다 — 앱 설정 화면)
 */
export const nextPushOnMarketing = (agreed: boolean, _current: PushConsent): Exclude<PushConsent, null> =>
  agreed ? 'agreed' : 'declined';
