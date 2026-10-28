import type { SocialProvider, User } from '../types';

export interface StoredUser extends User {
  /** 공급자 측 계정 키 (mock 소셜 로그인이 이 값으로 회원을 찾는다) */
  providerKey?: string;
}

/** mock 공급자가 돌려주는 계정 키. 시드 계정은 모두 카카오 */
export const MOCK_SOCIAL_KEYS = {
  active: 'kakao-mock-0001',
  withdrawing: 'kakao-mock-leaving',
  banned: 'kakao-mock-banned',
  google: 'google-mock-0001',
} as const;

/** mock 소셜 로그인이 기본으로 쓰는 공급자별 키 (카카오 = 정상 시드, 구글 = 처음엔 없는 계정) */
export const DEFAULT_SOCIAL_KEYS: Record<SocialProvider, string> = {
  kakao: MOCK_SOCIAL_KEYS.active,
  google: MOCK_SOCIAL_KEYS.google,
};

/** 새로 가입하는 mock 계정의 이름 */
export const MOCK_SOCIAL_NAMES: Record<SocialProvider, string> = {
  kakao: '카카오친구',
  google: '구글친구',
};

export function seedUsers(): StoredUser[] {
  return [
    {
      id: 'u-test',
      providerKey: MOCK_SOCIAL_KEYS.active,
      loginId: 'ka_test0001',
      email: 'test@wuzu.kr',
      name: '홍길동',
      birth: '1991-01-01',
      gender: 'male',
      provider: 'kakao',
      marketingAgreed: true,
      createdAt: '2025-03-01T09:00:00.000Z',
      status: 'active',
    },
    {
      id: 'u-leaving',
      providerKey: MOCK_SOCIAL_KEYS.withdrawing,
      loginId: 'ka_leave001',
      email: 'leaving@wuzu.kr',
      name: '김영희',
      birth: '1993-05-05',
      gender: 'female',
      provider: 'kakao',
      marketingAgreed: false,
      createdAt: '2024-11-20T09:00:00.000Z',
      status: 'withdrawing',
      withdrawRequestedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'u-banned',
      providerKey: MOCK_SOCIAL_KEYS.banned,
      loginId: 'ka_banned01',
      email: 'banned@wuzu.kr',
      name: '제재계정',
      provider: 'kakao',
      marketingAgreed: false,
      createdAt: '2024-08-01T09:00:00.000Z',
      status: 'banned',
    },
  ];
}
