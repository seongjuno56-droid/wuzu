import { CODE_TTL_MS, MAX_SEND, MOCK_CODE, createMockAuthService } from '../mock/mockAuthService';
import { KeyValueStorage } from '../types';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

const PW = 'wuzu1234!';
let svc: ReturnType<typeof createMockAuthService>;
beforeEach(() => {
  svc = createMockAuthService({ delayMs: 0, storage: memoryStorage() });
});

describe('login', () => {
  it('logs in the seeded active account', async () => {
    const r = await svc.login('test@wuzu.kr', PW);
    expect(r.ok && r.user.name).toBe('홍길동');
  });
  it('ignores case and surrounding spaces in email', async () => {
    const r = await svc.login(' Test@Wuzu.kr ', PW);
    expect(r.ok).toBe(true);
  });
  it('rejects a wrong password', async () => {
    expect(await svc.login('test@wuzu.kr', 'nope1234!')).toEqual({ ok: false, reason: 'invalid' });
  });
  it('reports withdrawing accounts with a 30 day cancel deadline', async () => {
    const r = await svc.login('leaving@wuzu.kr', PW);
    if (r.ok || r.reason !== 'withdrawing') throw new Error('expected withdrawing');
    const days = (Date.parse(r.cancelDeadline) - Date.parse(r.requestedAt)) / 86400000;
    expect(days).toBe(30);
  });
  it('allows login after cancelling withdrawal', async () => {
    const r = await svc.login('leaving@wuzu.kr', PW);
    if (r.ok || r.reason !== 'withdrawing') throw new Error('expected withdrawing');
    await svc.cancelWithdraw(r.userId);
    expect((await svc.login('leaving@wuzu.kr', PW)).ok).toBe(true);
  });
  it('reports banned accounts', async () => {
    expect(await svc.login('banned@wuzu.kr', PW)).toEqual({ ok: false, reason: 'banned' });
  });
});

describe('signup', () => {
  it('detects taken emails case-insensitively', async () => {
    expect(await svc.isEmailTaken('TEST@wuzu.kr')).toBe(true);
    expect(await svc.isEmailTaken('new@wuzu.kr')).toBe(false);
  });
  it('creates an email account that can log in', async () => {
    const user = await svc.signup({
      email: 'New@wuzu.kr', password: PW, name: '새회원', provider: 'email', marketingAgreed: true,
    });
    expect(user.email).toBe('new@wuzu.kr');
    expect(await svc.isEmailTaken('new@wuzu.kr')).toBe(true);
    expect((await svc.login('new@wuzu.kr', PW)).ok).toBe(true);
  });
  it('rejects signup with a taken email', async () => {
    await expect(
      svc.signup({ email: 'test@wuzu.kr', password: PW, name: 'x', provider: 'email', marketingAgreed: false }),
    ).rejects.toThrow('EMAIL_TAKEN');
  });
  it('kakao login returns null result until the social account signs up', async () => {
    const first = await svc.socialLogin('kakao');
    expect(first.result).toBeNull();
    await svc.signup({ name: first.profile.name, provider: 'kakao', providerKey: first.profile.providerKey, marketingAgreed: false });
    const second = await svc.socialLogin('kakao');
    expect(second.result?.ok).toBe(true);
  });
});

describe('findId', () => {
  it('returns email and join date for matching info', async () => {
    const r = await svc.findId({ name: '홍길동', birth: '1991-01-01', phone: '01012345678' });
    expect(r?.email).toBe('test@wuzu.kr');
  });
  it('returns null when nothing matches', async () => {
    expect(await svc.findId({ name: '홍길동', birth: '1990-01-01', phone: '01012345678' })).toBeNull();
  });
});

describe('password reset codes', () => {
  it('allows up to MAX_SEND sends then refuses', async () => {
    for (let i = 1; i <= MAX_SEND; i++) {
      const r = await svc.sendCode('test@wuzu.kr');
      expect(r.ok && r.sentCount).toBe(i);
    }
    expect(await svc.sendCode('test@wuzu.kr')).toEqual({ ok: false, reason: 'limit' });
  });
  it('lifts the send limit once the last code has expired', async () => {
    const now = 1_000_000;
    let last = 0;
    for (let i = 0; i < MAX_SEND; i++) {
      const r = await svc.sendCode('test@wuzu.kr', now);
      if (r.ok) last = r.expiresAt;
    }
    expect((await svc.sendCode('test@wuzu.kr', last)).ok).toBe(false);
    const after = await svc.sendCode('test@wuzu.kr', last + 1);
    expect(after.ok && after.sentCount).toBe(1);
  });
  it('refuses unknown emails', async () => {
    expect(await svc.sendCode('ghost@wuzu.kr')).toEqual({ ok: false, reason: 'not_found' });
  });
  it('verifies the mock code only before expiry', async () => {
    const now = 1_000_000;
    const r = await svc.sendCode('test@wuzu.kr', now);
    if (!r.ok) throw new Error('send failed');
    expect(r.expiresAt).toBe(now + CODE_TTL_MS);
    expect(await svc.verifyCode('test@wuzu.kr', '000000', now)).toBe(false);
    expect(await svc.verifyCode('test@wuzu.kr', MOCK_CODE, now + 1000)).toBe(true);
    expect(await svc.verifyCode('test@wuzu.kr', MOCK_CODE, r.expiresAt + 1)).toBe(false);
  });
  it('resets the password so the new one logs in', async () => {
    await svc.resetPassword('test@wuzu.kr', 'newpass12!');
    expect((await svc.login('test@wuzu.kr', PW)).ok).toBe(false);
    expect((await svc.login('test@wuzu.kr', 'newpass12!')).ok).toBe(true);
  });
});
