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
        return result;
      } catch (err) {
        await client.query('rollback');
        throw err;
      } finally {
        client.release();
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

async function openDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return pgPoolDb(new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } }));
  }
  // 로컬: admin/.pglite 파일 DB. 어드민은 admin/ 에서 실행한다
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = await PGlite.create(path.join(process.cwd(), '.pglite'));
  const db = pgliteDb(pglite);
  await migrate(db, { withAuthStub: true });
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
