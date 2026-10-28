/** 화면·CSV 에 보이는 한국어 표시 문구. 여러 화면이 함께 쓴다 */
import type { AuditAction, AuditTargetType } from './audit';

export const THEMES = ['wedding', 'dol', 'corporate', 'meetup'] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_LABEL: Record<ThemeId, string> = {
  wedding: '결혼식',
  dol: '돌잔치',
  corporate: '기업 행사',
  meetup: '모임',
};

export const MEMBER_STATUSES = ['active', 'withdrawing', 'banned'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: '정상',
  withdrawing: '탈퇴 진행 중',
  banned: '정지',
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

/** 작업 기록 종류 (admin_audit_logs.action) */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'member.ban': '회원 정지',
  'member.unban': '회원 정지 해제',
  'invitation.hide': '초대장 숨김',
  'invitation.unhide': '초대장 숨김 해제',
  'admin.create': '운영자 추가',
  'admin.deactivate': '운영자 비활성화',
  'admin.reactivate': '운영자 다시 켜기',
  'admin.password_change': '비밀번호 변경',
};

/** 작업 기록 대상 종류 (admin_audit_logs.target_type) */
export const AUDIT_TARGET_TYPE_LABEL: Record<AuditTargetType, string> = {
  member: '회원',
  invitation: '초대장',
  admin: '운영자',
};

/** 작업 기록 before·after 의 칸 이름 */
export const AUDIT_FIELD_LABEL: Record<string, string> = {
  status: '상태',
  banned: '표시',
  active: '활성',
  mustChangePassword: '비밀번호 변경 필요',
  email: '이메일',
  name: '이름',
};

/** 작업 기록 before·after 의 값 표시. 칸마다 원값 → 한국어 */
export const AUDIT_VALUE_LABEL: Record<string, Record<string, string>> = {
  status: MEMBER_STATUS_LABEL,
  banned: { true: '숨김', false: '보임' },
};
