/** 화면·CSV 에 보이는 한국어 표시 문구. 여러 화면이 함께 쓴다 */

export const THEMES = ['wedding', 'dol', 'corporate', 'meetup'] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_LABEL: Record<ThemeId, string> = {
  wedding: '결혼식',
  dol: '돌잔치',
  corporate: '기업 행사',
  meetup: '모임',
};

export const INVITATION_STATES = ['draft', 'active', 'expired'] as const;
/** 초대장 공개 상태: 활성화 전 → draft, 만료 전 → active, 아니면 expired */
export type InvitationState = (typeof INVITATION_STATES)[number];

export const INVITATION_STATE_LABEL: Record<InvitationState, string> = {
  draft: '작성 중',
  active: '활성',
  expired: '만료',
};

/** invitations.status (앱의 작성 단계) */
export const INVITATION_STATUS_LABEL: Record<string, string> = { draft: '작성 중', final: '완성' };

export const LEDGER_KIND_LABEL: Record<string, string> = {
  activate: '활성화',
  extend: '연장',
  edit: '수정',
  charge: '충전',
  signup_bonus: '가입 보너스',
  admin_grant: '운영자 지급',
  admin_revoke: '운영자 회수',
  refund: '환불',
};
