import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Db } from './db';

// 어드민은 admin/ 에서 실행한다. 스키마 파일은 저장소 루트의 supabase/ 에 있다
const supabaseDir = path.resolve(process.cwd(), '..', 'supabase');
const migrationsDir = path.join(supabaseDir, 'migrations');
const authStubFile = path.join(supabaseDir, 'test', 'auth_stub.sql');

async function migrationFiles(): Promise<string[]> {
  try {
    const names = await readdir(migrationsDir);
    return names.filter((n) => n.endsWith('.sql')).sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/** supabase/migrations/*.sql 을 이름순으로 올린다. schema_migrations 에 적힌 파일은 건너뛴다 */
export async function migrate(db: Db, opts: { withAuthStub?: boolean } = {}): Promise<void> {
  if (opts.withAuthStub) {
    await db.query(await readFile(authStubFile, 'utf8'));
  }

  await db.query(
    `create table if not exists schema_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const applied = new Set(
    (await db.query<{ name: string }>('select name from schema_migrations')).map((r) => r.name),
  );

  for (const name of await migrationFiles()) {
    if (applied.has(name)) continue;
    const sql = await readFile(path.join(migrationsDir, name), 'utf8');
    await db.tx(async (t) => {
      await t.query(sql);
      await t.query('insert into schema_migrations(name) values ($1)', [name]);
    });
  }
}
