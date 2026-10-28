import { socialLoginId, withdrawCancelDeadline } from '../../features/account/rules';
import type { AuthService, KeyValueStorage, SocialLoginResult, SocialProvider, User } from '../types';
import { DEFAULT_SOCIAL_KEYS, MOCK_SOCIAL_NAMES, StoredUser, seedUsers } from './seed';

export { MOCK_SOCIAL_KEYS } from './seed';

// 소셜 전용으로 바뀌며 시드 모양이 달라져 키를 올린다 (예전 v1 이메일 계정은 버린다)
const DB_KEY = 'wuzu.mock.db.v2';

interface Db {
  users: StoredUser[];
  /** 마지막으로 로그인한 회원 (실서버의 저장된 세션 대역) */
  sessionUserId: string | null;
}

function toPublic({ providerKey: _k, ...user }: StoredUser): User {
  return user;
}

function resultFor(user: StoredUser, isNew: boolean): SocialLoginResult {
  if (user.status === 'banned') return { ok: false, reason: 'banned' };
  if (user.status === 'withdrawing') {
    const requestedAt = user.withdrawRequestedAt ?? new Date().toISOString();
    return {
      ok: false,
      reason: 'withdrawing',
      userId: user.id,
      requestedAt,
      cancelDeadline: withdrawCancelDeadline(requestedAt),
    };
  }
  return { ok: true, user: toPublic(user), isNew };
}

/**
 * mock 인증. 공급자마다 정해진 mock 계정 키(socialKeys)로 로그인하고, 없으면 만든다.
 * 상태별 흐름은 socialKeys.kakao 를 MOCK_SOCIAL_KEYS.withdrawing / banned 로 바꿔 확인한다.
 */
export function createMockAuthService(opts: {
  delayMs: number;
  storage: KeyValueStorage;
  socialKeys?: Partial<Record<SocialProvider, string>>;
}): AuthService {
  const { delayMs, storage } = opts;
  const keys = { ...DEFAULT_SOCIAL_KEYS, ...opts.socialKeys };
  const wait = () => new Promise((r) => setTimeout(r, delayMs));

  async function load(): Promise<Db> {
    const raw = await storage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
    const db: Db = { users: seedUsers(), sessionUserId: null };
    await save(db);
    return db;
  }
  async function save(db: Db) {
    await storage.setItem(DB_KEY, JSON.stringify(db));
  }
  async function mutate(userId: string, change: (u: StoredUser) => void): Promise<User> {
    await wait();
    const db = await load();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('profile_not_found');
    change(user);
    await save(db);
    return toPublic(user);
  }

  return {
    async socialLogin(provider) {
      await wait();
      const db = await load();
      let user = db.users.find((u) => u.provider === provider && u.providerKey === keys[provider]);
      const isNew = !user;
      if (!user) {
        user = {
          id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          providerKey: keys[provider],
          loginId: socialLoginId(provider),
          email: null,
          name: MOCK_SOCIAL_NAMES[provider],
          provider,
          marketingAgreed: false,
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        db.users.push(user);
      }
      const result = resultFor(user, isNew);
      // 정지 계정은 세션을 남기지 않는다 (실서버도 signOut)
      db.sessionUserId = user.status === 'banned' ? null : user.id;
      await save(db);
      return result;
    },

    async currentUser() {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === db.sessionUserId);
      if (!user || user.status === 'banned') return null;
      return toPublic(user);
    },

    async logout() {
      await wait();
      const db = await load();
      db.sessionUserId = null;
      await save(db);
    },

    async cancelWithdraw(userId) {
      return mutate(userId, (user) => {
        if (user.status !== 'withdrawing') throw new Error('cannot_cancel_withdraw');
        user.status = 'active';
        delete user.withdrawRequestedAt;
      });
    },

    async updateProfile(userId, values) {
      return mutate(userId, (user) => {
        user.birth = values.birth;
        user.gender = values.gender;
        if (user.marketingAgreed !== values.marketingAgreed) {
          user.marketingUpdatedAt = new Date().toISOString();
        }
        user.marketingAgreed = values.marketingAgreed;
        user.profileUpdatedAt = new Date().toISOString();
      });
    },

    async updateAccount(userId, values) {
      return mutate(userId, (user) => {
        user.name = values.name;
        user.birth = values.birth;
        user.gender = values.gender;
        user.profileUpdatedAt = new Date().toISOString();
      });
    },

    async setMarketing(userId, agreed) {
      return mutate(userId, (user) => {
        user.marketingAgreed = agreed;
        user.marketingUpdatedAt = new Date().toISOString();
      });
    },

    async requestWithdraw(userId) {
      await mutate(userId, (user) => {
        if (user.status !== 'active') throw new Error('invalid_status');
        user.status = 'withdrawing';
        user.withdrawRequestedAt = new Date().toISOString();
      });
    },
  };
}
