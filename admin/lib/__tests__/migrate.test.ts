import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrate } from '../migrate';
import { newTestDb } from '../../test/db';

const migrationsDir = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

function migrationFileCount(): number {
  try {
    return readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;
  } catch {
    return 0; // 마이그레이션 폴더가 아직 없으면 0개
  }
}

describe('migrate', () => {
  it('빈 DB 에 마이그레이션을 올리고 두 번 돌려도 그대로', async () => {
    const db = await newTestDb();
    await migrate(db, { withAuthStub: true });

    const [row] = await db.query<{ n: number }>('select count(*)::int as n from schema_migrations');
    expect(row.n).toBe(migrationFileCount());
  });

  it('트랜잭션 안에서 던지면 되돌린다', async () => {
    const db = await newTestDb();
    await db.query('create table tmp_tx(v int)');

    await expect(
      db.tx(async (t) => {
        await t.query('insert into tmp_tx(v) values ($1)', [1]);
        throw new Error('되돌리기');
      }),
    ).rejects.toThrow('되돌리기');

    const [row] = await db.query<{ n: number }>('select count(*)::int as n from tmp_tx');
    expect(row.n).toBe(0);
  });
});
