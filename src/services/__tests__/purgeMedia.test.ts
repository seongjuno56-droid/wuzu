/** @jest-environment node */
import {
  constantTimeEqual,
  handlePurgeMedia,
  isPurgeableKey,
  type PurgeMediaDeps,
} from '../../../supabase/functions/_shared/purgeMedia';

const ID = '11111111-2222-4333-8444-555555555555';
const UPPER_ID = 'ABCDEF11-2222-4333-8444-555555555555';
const R = 'a'.repeat(32);
const KEY = (n: number) => `invitations/${ID}/${String(n).padStart(32, '0')}.webp`;
const SECRET = 'x'.repeat(40);

function deps(queue: { key: string; kind: string }[][], over: Partial<PurgeMediaDeps> = {}) {
  const pending = [...queue];
  const deleted: string[] = [];
  const done: string[][] = [];
  const d: PurgeMediaDeps = {
    secret: SECRET,
    claim: jest.fn(async () => pending.shift() ?? []),
    deleteObject: jest.fn(async (key: string) => {
      deleted.push(key);
      return 204;
    }),
    markDone: jest.fn(async (keys: string[]) => {
      done.push(keys);
    }),
    now: () => 0,
    log: jest.fn(),
    ...over,
  };
  return { d, deleted, done };
}

describe('isPurgeableKey', () => {
  it('record_media_file 와 같은 모양만 통과한다', () => {
    const ok: [string, string][] = [
      ['image', `invitations/${ID}/${R}.webp`],
      ['image', `invitations/${ID}/${R}.jpg`],
      ['image', `invitations/${ID}/${R}.png`],
      ['thumb', `invitations/${ID}/${R}_thumb.webp`],
      ['linkThumb', `invitations/${ID}/${R}.jpg`],
      ['gif', `invitations/${ID}/${R}.gif`],
      ['video', `invitations/${ID}/${R}.mp4`],
      ['video', `invitations/${ID}/${R}.mov`],
      ['bgm', `invitations/${ID}/${R}.mp3`],
      ['bgm', `invitations/${ID}/${R}.m4a`],
      ['bgm', `invitations/${ID}/${R}.aac`],
      ['bgm', `invitations/${ID}/${R}.wav`],
      ['bgm', `invitations/${ID}/${R}.ogg`],
    ];
    for (const [kind, key] of ok) expect([kind, key, isPurgeableKey(key, kind)]).toEqual([kind, key, true]);
  });

  it.each([
    ['경로 올라가기', 'image', `invitations/${ID}/../${ID}/${R}.webp`],
    ['폴더 전체', 'image', `invitations/${ID}/`],
    ['버킷 전체', 'image', ''],
    ['난수 짧음', 'image', `invitations/${ID}/abc.webp`],
    ['대문자 난수', 'image', `invitations/${ID}/${'A'.repeat(32)}.webp`],
    ['다른 앞 폴더', 'image', `other/${ID}/${R}.webp`],
    ['uuid 아님', 'image', `invitations/not-a-uuid/${R}.webp`],
    ['대문자 uuid', 'image', `invitations/${UPPER_ID}/${R}.webp`],
    ['종류와 확장자 다름', 'gif', `invitations/${ID}/${R}.webp`],
    ['썸네일이 아닌데 _thumb', 'image', `invitations/${ID}/${R}_thumb.webp`],
    ['링크 썸네일 webp', 'linkThumb', `invitations/${ID}/${R}.webp`],
    ['모르는 종류', 'exe', `invitations/${ID}/${R}.webp`],
    ['프로토타입 이름', 'constructor', `invitations/${ID}/${R}.webp`],
    ['줄바꿈 뒤 꼬리', 'image', `invitations/${ID}/${R}.webp\nx`],
    ['질의 문자열', 'image', `invitations/${ID}/${R}.webp?x=1`],
  ])('%s 는 거부', (_name, kind, key) => {
    expect(isPurgeableKey(key, kind)).toBe(false);
  });
});

describe('constantTimeEqual', () => {
  it('같을 때만 true', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('abcd', 'abc')).toBe(false);
    expect(constantTimeEqual('', 'abc')).toBe(false);
    expect(constantTimeEqual('비밀', '비밀')).toBe(true);
    // 앞부분만 반복되는 값도 다르다
    expect(constantTimeEqual('abcabc', 'abc')).toBe(false);
  });
});

describe('handlePurgeMedia', () => {
  it.each([[null], [''], ['틀린 값'], [SECRET + 'x']])('비밀값 %p 는 401 이고 아무것도 읽지 않는다', async (given) => {
    const { d, deleted } = deps([[{ key: KEY(1), kind: 'image' }]]);
    const r = await handlePurgeMedia(given, d);
    expect(r.status).toBe(401);
    expect(d.claim).not.toHaveBeenCalled();
    expect(deleted).toEqual([]);
  });

  it.each([[undefined], [''], ['짧은값']])('서버 비밀값이 %p 이면 어떤 요청도 통과시키지 않는다', async (secret) => {
    const { d } = deps([], { secret });
    expect((await handlePurgeMedia(secret ?? '', d)).status).toBe(500);
    expect((await handlePurgeMedia('', d)).status).toBe(500);
    expect(d.claim).not.toHaveBeenCalled();
  });

  it('지운 파일을 표시하고, 실패한 파일은 표시하지 않아 다음 실행에 다시 지운다', async () => {
    const q = [1, 2, 3, 4].map((n) => ({ key: KEY(n), kind: 'image' }));
    const { d, done } = deps([q], {
      deleteObject: jest.fn(async (key: string) => {
        if (key === KEY(2)) return 500;
        if (key === KEY(3)) throw new Error('네트워크 비밀값 sk-1234');
        // 404 는 버킷 이름이 틀려도(NoSuchBucket) 온다. 지워졌다고 표시하면 파일이 남은 채 대기열에서 사라진다
        return key === KEY(4) ? 404 : 204;
      }),
    });
    const r = await handlePurgeMedia(SECRET, d);
    expect(r).toEqual({ status: 200, body: { deleted: 1, failed: 3, skipped: 0 } });
    expect(done.flat()).toEqual([KEY(1)]);
    expect(JSON.stringify((d.log as jest.Mock).mock.calls)).not.toContain('sk-1234');
    expect(JSON.stringify(r)).not.toContain('sk-1234');
  });

  it('모양이 틀린 키는 R2 에 보내지 않고 표시도 하지 않는다', async () => {
    const bad = `invitations/${ID}/../${ID}/${R}.webp`;
    const { d, deleted, done } = deps([[{ key: bad, kind: 'image' }, { key: KEY(1), kind: 'image' }]]);
    const r = await handlePurgeMedia(SECRET, d);
    expect(r.body).toEqual({ deleted: 1, failed: 0, skipped: 1 });
    expect(deleted).toEqual([KEY(1)]);
    expect(done.flat()).toEqual([KEY(1)]);
  });

  it('작은 묶음으로 읽고 대기열이 빌 때까지 돈다', async () => {
    const batch = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ key: KEY(from + i), kind: 'image' }));
    const { d, deleted } = deps([batch(0, 50), batch(50, 3)]);
    const r = await handlePurgeMedia(SECRET, d);
    expect(r.body).toEqual({ deleted: 53, failed: 0, skipped: 0 });
    expect(d.claim).toHaveBeenCalledWith(50);
    // 묶음이 가득 차지 않으면 더 읽지 않는다
    expect(d.claim).toHaveBeenCalledTimes(2);
    expect(deleted).toHaveLength(53);
  });

  it('한 번에 동시에 지우는 수를 제한한다', async () => {
    let running = 0;
    let peak = 0;
    const { d } = deps([Array.from({ length: 30 }, (_, i) => ({ key: KEY(i), kind: 'image' }))], {
      deleteObject: jest.fn(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setImmediate(resolve));
        running -= 1;
        return 204;
      }),
    });
    await handlePurgeMedia(SECRET, d);
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });

  it('묶음 하나가 최악으로 걸려도 150초 안에 끝나게 65초 뒤에는 새 묶음을 읽지 않는다', async () => {
    let t = 0;
    const full = Array.from({ length: 50 }, (_, i) => ({ key: KEY(i), kind: 'image' }));
    const { d } = deps([full, full, full], {
      now: () => t,
      markDone: jest.fn(async () => {
        t += 65_000;
      }),
    });
    await handlePurgeMedia(SECRET, d);
    expect(d.claim).toHaveBeenCalledTimes(1);
  });

  it('시간 예산을 넘으면 다음 묶음을 읽지 않는다', async () => {
    let t = 0;
    const full = Array.from({ length: 50 }, (_, i) => ({ key: KEY(i), kind: 'image' }));
    const { d } = deps([full, full, full], {
      now: () => t,
      markDone: jest.fn(async () => {
        t += 200_000;
      }),
    });
    const r = await handlePurgeMedia(SECRET, d);
    expect(d.claim).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(200);
  });

  it('대기열·표시가 실패하면 500 이고 내부 내용을 내보내지 않는다. 지운 파일은 다음 실행에 다시 지워도 괜찮다', async () => {
    const { d } = deps([], {
      claim: jest.fn(async () => {
        throw new Error('secret-in-error');
      }),
    });
    const r = await handlePurgeMedia(SECRET, d);
    expect(r).toEqual({ status: 500, body: { error: 'server_error' } });
    expect(JSON.stringify((d.log as jest.Mock).mock.calls)).not.toContain('secret-in-error');

    const { d: d2 } = deps([[{ key: KEY(1), kind: 'image' }]], {
      markDone: jest.fn(async () => {
        throw new Error('secret-in-error');
      }),
    });
    const r2 = await handlePurgeMedia(SECRET, d2);
    expect(r2.status).toBe(500);
    expect(JSON.stringify((d2.log as jest.Mock).mock.calls)).not.toContain('secret-in-error');
  });
});
