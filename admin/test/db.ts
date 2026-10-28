import { PGlite } from '@electric-sql/pglite';
import { pgliteDb, type Db } from '../lib/db';
import { migrate } from '../lib/migrate';

/** 테스트마다 새 메모리 PGlite 에 auth 흉내와 마이그레이션을 올린다 */
export async function newTestDb(): Promise<Db> {
  const db = pgliteDb(await PGlite.create());
  await migrate(db, { withAuthStub: true });
  return db;
}

/** auth.users 와 profiles 에 회원 한 명을 넣고 id 를 돌려준다 */
export async function addMember(
  db: Db,
  m: {
    name: string;
    email?: string | null;
    loginId?: string | null;
    provider?: 'email' | 'kakao' | 'google' | 'apple';
    status?: 'active' | 'withdrawing' | 'banned';
    createdAt?: string;
  },
): Promise<string> {
  const [u] = await db.query<{ id: string }>(`insert into auth.users(email) values ($1) returning id`, [m.email ?? null]);
  await db.query(
    `insert into profiles(id, login_id, email, name, provider, status, created_at)
     values ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()))`,
    [u.id, m.loginId ?? null, m.email ?? null, m.name, m.provider ?? 'email', m.status ?? 'active', m.createdAt ?? null],
  );
  return u.id;
}

/** 운영자 한 명을 만들고 id 를 돌려준다 */
export async function addAdmin(db: Db, email = 'a@wuzu.kr', name = '운영자'): Promise<string> {
  const [a] = await db.query<{ id: string }>(
    `insert into admins(email, name, password_hash) values ($1, $2, 'x') returning id`,
    [email, name],
  );
  return a.id;
}
