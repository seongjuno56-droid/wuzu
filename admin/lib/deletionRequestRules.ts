/**
 * 계정 삭제 요청의 값 목록·글자 수 제한. 공개 폼(클라이언트)과 서버가 함께 쓰므로 server-only 가 아닌 파일에 둔다.
 */

/** 로그인 방식. 모르면 unknown */
export const DELETION_PROVIDERS = ['kakao', 'google', 'unknown'] as const;
export type DeletionProvider = (typeof DELETION_PROVIDERS)[number];

export const DELETION_PROVIDER_LABEL: Record<DeletionProvider, string> = {
  kakao: '카카오',
  google: '구글',
  unknown: '모름',
};

export const CONTACT_EMAIL_MAX = 254;
export const ACCOUNT_NAME_MAX = 50;
export const DELETION_MESSAGE_MAX = 1000;
