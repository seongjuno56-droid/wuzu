import { PGlite } from '@electric-sql/pglite';
import { pgliteDb, type Db } from '../lib/db';
import { migrate } from '../lib/migrate';

/** 테스트마다 새 메모리 PGlite 에 auth 흉내와 마이그레이션을 올린다 */
export async function newTestDb(): Promise<Db> {
  const db = pgliteDb(await PGlite.create());
  await migrate(db, { withAuthStub: true });
  return db;
}
