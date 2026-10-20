import { socialLoginId } from '../../features/account/rules';
import { normalizeEmail } from '../../lib/validators';
import { AuthService, KeyValueStorage, LoginResult, User } from '../types';
import { MOCK_KAKAO_PROFILE, StoredUser, seedUsers } from './seed';

export const MOCK_CODE = '123456';
export const MAX_SEND = 3;
export const CODE_TTL_MS = 5 * 60 * 1000;
const WITHDRAW_GRACE_DAYS = 30;
const DB_KEY = 'wuzu.mock.db.v1';

interface CodeState {
  sentCount: number;
  expiresAt: number;
}
interface Db {
  users: StoredUser[];
  codes: Record<string, CodeState>;
}

function toPublic({ password: _p, providerKey: _k, ...user }: StoredUser): User {
  return user;
}

function loginResultFor(user: StoredUser): LoginResult {
  if (user.status === 'banned') return { ok: false, reason: 'banned' };
  if (user.status === 'withdrawing') {
    const requestedAt = user.withdrawRequestedAt ?? new Date().toISOString();
    const cancelDeadline = new Date(
      Date.parse(requestedAt) + WITHDRAW_GRACE_DAYS * 86400000,
    ).toISOString();
    return { ok: false, reason: 'withdrawing', userId: user.id, requestedAt, cancelDeadline };
  }
  return { ok: true, user: toPublic(user) };
}

export function createMockAuthService(opts: {
  delayMs: number;
  storage: KeyValueStorage;
}): AuthService {
  const { delayMs, storage } = opts;
  const wait = () => new Promise((r) => setTimeout(r, delayMs));

  async function load(): Promise<Db> {
    const raw = await storage.getItem(DB_KEY);
    const db: Db = raw ? (JSON.parse(raw) as Db) : { users: seedUsers(), codes: {} };
    // 아이디가 없는 계정 보정: 이메일 가입은 이메일, 간편 로그인은 자동 부여
    let changed = !raw;
    for (const u of db.users) {
      if (!u.loginId) {
        u.loginId = u.email ?? socialLoginId();
        changed = true;
      }
    }
    if (changed) await save(db);
    return db;
  }
  async function save(db: Db) {
    await storage.setItem(DB_KEY, JSON.stringify(db));
  }
  const byEmail = (db: Db, email: string) =>
    db.users.find((u) => u.email === normalizeEmail(email));

  return {
    async login(email, password) {
      await wait();
      const user = byEmail(await load(), email);
      if (!user || user.password !== password) return { ok: false, reason: 'invalid' };
      return loginResultFor(user);
    },

    async socialLogin() {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.providerKey === MOCK_KAKAO_PROFILE.providerKey);
      return { result: user ? loginResultFor(user) : null, profile: MOCK_KAKAO_PROFILE };
    },

    async isEmailTaken(email) {
      await wait();
      return !!byEmail(await load(), email);
    },

    async signup(input) {
      await wait();
      const db = await load();
      const email = input.email ? normalizeEmail(input.email) : null;
      if (email && byEmail(db, email)) throw new Error('EMAIL_TAKEN');
      const user: StoredUser = {
        id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        email,
        loginId: email ?? socialLoginId(),
        password: input.password,
        providerKey: input.providerKey,
        name: input.name,
        birth: input.birth,
        gender: input.gender,
        phone: input.phone,
        provider: input.provider,
        marketingAgreed: input.marketingAgreed,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      db.users.push(user);
      await save(db);
      return toPublic(user);
    },

    async cancelWithdraw(userId) {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error('NOT_FOUND');
      user.status = 'active';
      delete user.withdrawRequestedAt;
      await save(db);
      return toPublic(user);
    },

    async findId({ name, birth, phone }) {
      await wait();
      const db = await load();
      const user = db.users.find(
        (u) => u.email && u.name === name && u.birth === birth && u.phone === phone,
      );
      return user ? { email: user.email!, createdAt: user.createdAt } : null;
    },

    async sendCode(email, now = Date.now()) {
      await wait();
      const db = await load();
      const user = byEmail(db, email);
      if (!user) return { ok: false, reason: 'not_found' };
      const key = user.email!;
      // 마지막 인증번호가 만료되면 발송 횟수도 초기화 (5분 후 재발송 가능)
      const prev = db.codes[key] && now <= db.codes[key].expiresAt ? db.codes[key] : undefined;
      if (prev && prev.sentCount >= MAX_SEND) return { ok: false, reason: 'limit' };
      const state = { sentCount: (prev?.sentCount ?? 0) + 1, expiresAt: now + CODE_TTL_MS };
      db.codes[key] = state;
      await save(db);
      return { ok: true, ...state };
    },

    async verifyCode(email, code, now = Date.now()) {
      await wait();
      const state = (await load()).codes[normalizeEmail(email)];
      return !!state && now <= state.expiresAt && code === MOCK_CODE;
    },

    async updateProfile(userId, values) {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error('NOT_FOUND');
      user.birth = values.birth;
      user.gender = values.gender;
      user.marketingAgreed = values.marketingAgreed;
      await save(db);
      return toPublic(user);
    },

    async updateAccount(userId, values) {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error('NOT_FOUND');
      user.name = values.name;
      user.birth = values.birth;
      user.gender = values.gender;
      user.profileUpdatedAt = new Date().toISOString();
      await save(db);
      return toPublic(user);
    },

    async setMarketing(userId, agreed) {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error('NOT_FOUND');
      user.marketingAgreed = agreed;
      user.marketingUpdatedAt = new Date().toISOString();
      await save(db);
      return toPublic(user);
    },

    async requestWithdraw(userId) {
      await wait();
      const db = await load();
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error('NOT_FOUND');
      user.status = 'withdrawing';
      user.withdrawRequestedAt = new Date().toISOString();
      await save(db);
    },

    async resetPassword(email, newPassword) {
      await wait();
      const db = await load();
      const user = byEmail(db, email);
      if (!user) throw new Error('NOT_FOUND');
      user.password = newPassword;
      delete db.codes[user.email!];
      await save(db);
    },
  };
}
