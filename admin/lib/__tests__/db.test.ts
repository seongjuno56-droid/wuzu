import { describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { createPgPool, dbTarget, pgPoolDb } from '../db';

/** query 동작을 정해 둔 가짜 pg 클라이언트와 그 클라이언트만 내주는 가짜 풀 */
function fakePool(onQuery: (sql: string) => Promise<unknown>) {
  const client = {
    query: vi.fn((sql: string) => onQuery(sql)),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn(async () => client), query: vi.fn() };
  return { client, pool: pool as unknown as pg.Pool };
}

describe('어떤 DB 를 쓸지', () => {
  it('DATABASE_URL 이 있으면 pg', () => {
    expect(dbTarget({ DATABASE_URL: 'postgres://x', NODE_ENV: 'production' })).toEqual({
      kind: 'pg',
      url: 'postgres://x',
    });
  });

  it('DATABASE_URL 이 없으면 개발·테스트에서는 로컬 PGlite', () => {
    expect(dbTarget({ NODE_ENV: 'development' })).toEqual({ kind: 'pglite' });
    expect(dbTarget({ NODE_ENV: 'test', DATABASE_URL: '' })).toEqual({ kind: 'pglite' });
  });

  it('운영에서 DATABASE_URL 이 없으면 로컬 DB·시드로 가지 않고 바로 오류', () => {
    expect(() => dbTarget({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL 이 없습니다 — 운영에서는 로컬 DB 를 쓰지 않습니다',
    );
    expect(() => dbTarget({ NODE_ENV: 'production', DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });
});

describe('pg 풀', () => {
  it('서버리스용 옵션(최대 3개, 유휴 10초)과 오류 리스너가 붙는다', async () => {
    const pool = createPgPool('postgres://user:pw@127.0.0.1:1/none');
    try {
      expect(pool.options.max).toBe(3);
      expect(pool.options.idleTimeoutMillis).toBe(10_000);
      expect(pool.listenerCount('error')).toBeGreaterThan(0);

      // 유휴 연결 오류가 와도 프로세스가 죽지 않고 로그만 남는다
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => pool.emit('error', new Error('연결 끊김'))).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    } finally {
      await pool.end();
    }
  });

  it('tx 성공이면 commit 하고 클라이언트를 평소대로 돌려준다', async () => {
    const { client, pool } = fakePool(async () => ({ rows: [] }));
    await expect(pgPoolDb(pool).tx(async () => 7)).resolves.toBe(7);
    expect(client.query.mock.calls.map((c) => c[0])).toEqual(['begin', 'commit']);
    expect(client.release).toHaveBeenCalledWith();
  });

  it('tx 안에서 던지면 rollback 하고 원래 오류를 그대로 던진다', async () => {
    const { client, pool } = fakePool(async () => ({ rows: [] }));
    await expect(
      pgPoolDb(pool).tx(async () => {
        throw new Error('원래 오류');
      }),
    ).rejects.toThrow('원래 오류');
    expect(client.query.mock.calls.map((c) => c[0])).toEqual(['begin', 'rollback']);
    expect(client.release).toHaveBeenCalledWith();
  });

  it('rollback 마저 실패하면 원래 오류를 지키고 망가진 클라이언트는 버린다', async () => {
    const rollbackErr = new Error('rollback 실패');
    const { client, pool } = fakePool(async (sql) => {
      if (sql === 'rollback') throw rollbackErr;
      return { rows: [] };
    });
    await expect(
      pgPoolDb(pool).tx(async () => {
        throw new Error('원래 오류');
      }),
    ).rejects.toThrow('원래 오류');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(rollbackErr);
  });
});
