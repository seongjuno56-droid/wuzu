import { User } from '../types';

export interface StoredUser extends User {
  password?: string;
  providerKey?: string;
}

export const SEED_PASSWORD = 'wuzu1234!';

export function seedUsers(): StoredUser[] {
  return [
    {
      id: 'u-test',
      email: 'test@wuzu.kr',
      password: SEED_PASSWORD,
      name: '홍길동',
      birth: '1991-01-01',
      gender: 'male',
      phone: '01012345678',
      provider: 'email',
      marketingAgreed: true,
      createdAt: '2025-03-01T09:00:00.000Z',
      status: 'active',
    },
    {
      id: 'u-leaving',
      email: 'leaving@wuzu.kr',
      password: SEED_PASSWORD,
      name: '김영희',
      birth: '1993-05-05',
      gender: 'female',
      phone: '01022223333',
      provider: 'email',
      marketingAgreed: false,
      createdAt: '2024-11-20T09:00:00.000Z',
      status: 'withdrawing',
      withdrawRequestedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'u-banned',
      email: 'banned@wuzu.kr',
      password: SEED_PASSWORD,
      name: '제재계정',
      phone: '01099998888',
      provider: 'email',
      marketingAgreed: false,
      createdAt: '2024-08-01T09:00:00.000Z',
      status: 'banned',
    },
  ];
}

/** mock 카카오 SDK가 돌려주는 프로필 */
export const MOCK_KAKAO_PROFILE = { providerKey: 'kakao-mock-0001', name: '카카오친구' };
