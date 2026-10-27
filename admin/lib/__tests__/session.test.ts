import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_TTL_SECONDS, signSession, verifySession } from '../session';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';
const ADMIN_ID = '11111111-2222-4333-8444-555555555555';

describe('세션 토큰', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SESSION_SECRET', SECRET);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('서명한 토큰을 확인하면 adminId 가 나온다', async () => {
    const token = await signSession(ADMIN_ID);
    expect(await verifySession(token)).toEqual({ adminId: ADMIN_ID });
  });

  it('서명이 바뀐 토큰·만료된 토큰은 null', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
    const token = await signSession(ADMIN_ID);

    // 서명 부분 한 글자 바꾸기
    const [h, p, s] = token.split('.');
    const flipped = s[0] === 'A' ? 'B' + s.slice(1) : 'A' + s.slice(1);
    expect(await verifySession(`${h}.${p}.${flipped}`)).toBeNull();

    // 다른 비밀값으로 서명한 토큰
    vi.stubEnv('ADMIN_SESSION_SECRET', 'another-secret-0123456789-abcdefghij');
    const foreign = await signSession(ADMIN_ID);
    vi.stubEnv('ADMIN_SESSION_SECRET', SECRET);
    expect(await verifySession(foreign)).toBeNull();

    // 아무 모양도 아닌 값
    expect(await verifySession('not-a-token')).toBeNull();

    // 12시간 직전까지는 유효, 지나면 만료
    vi.setSystemTime(new Date(Date.parse('2026-10-27T00:00:00Z') + (SESSION_TTL_SECONDS - 60) * 1000));
    expect(await verifySession(token)).toEqual({ adminId: ADMIN_ID });
    vi.setSystemTime(new Date(Date.parse('2026-10-27T00:00:00Z') + (SESSION_TTL_SECONDS + 1) * 1000));
    expect(await verifySession(token)).toBeNull();
  });

  it('비밀값이 없거나 32자 미만이면 분명한 오류', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', '');
    await expect(signSession(ADMIN_ID)).rejects.toThrow(/ADMIN_SESSION_SECRET/);
    vi.stubEnv('ADMIN_SESSION_SECRET', 'x'.repeat(31));
    await expect(signSession(ADMIN_ID)).rejects.toThrow(/32자/);
    await expect(verifySession('a.b.c')).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });
});
