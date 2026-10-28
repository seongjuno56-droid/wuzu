import 'server-only';
import path from 'node:path';
import type { PGlite, Transaction } from '@electric-sql/pglite';
import pg from 'pg';
import { migrate } from './migrate';

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
}

type PgQueryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

/** pg 결과는 여러 문장이면 배열로 온다. 마지막 문장의 행을 돌려준다 */
function lastRows<T>(res: pg.QueryResult | pg.QueryResult[]): T[] {
  const last = Array.isArray(res) ? res[res.length - 1] : res;
  return (last?.rows ?? []) as T[];
}

async function pgQuery<T>(q: PgQueryable, sql: string, params?: unknown[]): Promise<T[]> {
  const res = (await q.query(sql, params)) as pg.QueryResult | pg.QueryResult[];
  return lastRows<T>(res);
}

/** 트랜잭션에 묶인 클라이언트 하나. 안에서 다시 tx 를 부르면 같은 트랜잭션을 그대로 쓴다 */
function pgClientDb(client: pg.PoolClient): Db {
  const db: Db = {
    query: (sql, params) => pgQuery(client, sql, params),
    tx: (fn) => fn(db),
  };
  return db;
}

export function pgPoolDb(pool: pg.Pool): Db {
  return {
    query: (sql, params) => pgQuery(pool, sql, params),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await fn(pgClientDb(client));
        await client.query('commit');
        client.release();
        return result;
      } catch (err) {
        // rollback 이 실패해도 원래 오류를 던진다. 그 클라이언트는 상태를 알 수 없으니 풀에서 버린다
        const rollbackErr = await client.query('rollback').then(
          () => null,
          (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
        );
        if (rollbackErr) client.release(rollbackErr);
        else client.release();
        throw err;
      }
    },
  };
}

/**
 * PGlite 의 query 는 문장 하나만 받는다. 매개변수가 없으면 exec 로 돌려
 * 마이그레이션 파일처럼 여러 문장이 든 SQL 도 실행되게 한다.
 */
async function pgliteQuery<T>(q: PGlite | Transaction, sql: string, params?: unknown[]): Promise<T[]> {
  if (params && params.length > 0) {
    const res = await q.query<T>(sql, params);
    return res.rows;
  }
  const results = await q.exec(sql);
  return (results[results.length - 1]?.rows ?? []) as T[];
}

function pgliteTxDb(tx: Transaction): Db {
  const db: Db = {
    query: (sql, params) => pgliteQuery(tx, sql, params),
    tx: (fn) => fn(db),
  };
  return db;
}

export function pgliteDb(pglite: PGlite): Db {
  return {
    query: (sql, params) => pgliteQuery(pglite, sql, params),
    tx: (fn) => pglite.transaction((tx) => fn(pgliteTxDb(tx))),
  };
}

/**
 * 운영 DB 연결 풀. 서버리스 함수마다 풀이 생기고 Supabase 세션 풀러는 연결 수가 적으므로
 * 연결을 조금만(3개) 쓰고 유휴 연결은 빨리(10초) 닫는다.
 * 유휴 연결이 끊겨 풀이 error 를 내도 리스너가 없으면 프로세스가 죽으므로 로그만 남긴다.
 */
export function createPgPool(url: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    console.error('DB 유휴 연결 오류:', err);
  });
  return pool;
}

export type DbTarget = { kind: 'pg'; url: string } | { kind: 'pglite' };

/**
 * 어떤 DB 를 쓸지 정한다. DATABASE_URL 이 있으면 그 주소, 없으면 로컬 PGlite.
 * 운영(NODE_ENV=production)에서 DATABASE_URL 이 빠졌으면 로컬 DB·시드로 가지 않고 바로 멈춘다.
 */
export function dbTarget(env: { DATABASE_URL?: string; NODE_ENV?: string }): DbTarget {
  if (env.DATABASE_URL) return { kind: 'pg', url: env.DATABASE_URL };
  if (env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL 이 없습니다 — 운영에서는 로컬 DB 를 쓰지 않습니다');
  }
  return { kind: 'pglite' };
}

async function openDb(): Promise<Db> {
  const target = dbTarget(process.env);
  if (target.kind === 'pg') return pgPoolDb(createPgPool(target.url));
  // 로컬: admin/.pglite 파일 DB. 어드민은 admin/ 에서 실행한다
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = await PGlite.create(path.join(process.cwd(), '.pglite'));
  const db = pgliteDb(pglite);
  await migrate(db, { withAuthStub: true });
  // 빈 로컬 DB 면 시드(운영자·회원·초대장·원장). seed → admins → db 로 돌아오므로 여기서 불러온다
  const { seedIfEmpty } = await import('./seed');
  if (await seedIfEmpty(db, process.env.DATABASE_URL)) {
    console.log('로컬 DB 에 시드를 넣었습니다. 로그인: admin@wuzu.local / wuzu-admin-1234');
  }
  return db;
}

// 개발 서버의 모듈 다시 불러오기에도 연결을 하나만 유지한다
const globalForDb = globalThis as unknown as { __wuzuAdminDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__wuzuAdminDb ??= openDb().catch((err) => {
    globalForDb.__wuzuAdminDb = undefined;
    throw err;
  });
  return globalForDb.__wuzuAdminDb;
}
