import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { newTestDb } from '../../test/db';

/** auth.users 와 profiles 에 회원 한 명을 만들고 id 를 돌려준다 */
async function addUser(db: Db): Promise<string> {
  const [u] = await db.query<{ id: string }>(
    `insert into auth.users(email) values ('a@example.com') returning id`,
  );
  await db.query(`insert into profiles(id, name, provider) values ($1, '회원', 'email')`, [u.id]);
  return u.id;
}

async function addInvitation(db: Db, ownerId: string, number: string, slug: string) {
  await db.query(
    `insert into invitations(owner_id, number, slug, theme_id, template_id, name, content)
     values ($1, $2, $3, 'wedding', 'w1', '초대장', '{}')`,
    [ownerId, number, slug],
  );
}

async function addLedger(db: Db, userId: string, number: string, kind: string, total: number) {
  await db.query(
    `insert into ledger_entries(number, user_id, kind, title, total) values ($1, $2, $3, '내역', $4)`,
    [number, userId, kind, total],
  );
}

describe('핵심 스키마', () => {
  it('모든 표에 RLS 가 켜져 있다', async () => {
    const db = await newTestDb();
    const rows = await db.query<{ relname: string }>(
      `select relname from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(rows.map((r) => r.relname).filter((n) => n !== 'schema_migrations')).toEqual([]);

    // 표가 실제로 만들어졌는지도 확인(빈 스키마면 위 검사가 그냥 통과하므로)
    const [t] = await db.query<{ n: number }>(
      `select count(*)::int as n from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity`,
    );
    expect(t.n).toBe(7);
  });

  it('초대장 slug 는 10자 미만이면 거절, 같은 slug 두 번이면 거절', async () => {
    const db = await newTestDb();
    const owner = await addUser(db);

    await expect(addInvitation(db, owner, '00000000001', 'short')).rejects.toThrow();
    await addInvitation(db, owner, '00000000002', 'abcdefghij');
    await expect(addInvitation(db, owner, '00000000003', 'abcdefghij')).rejects.toThrow();
  });

  it('초대장No 는 숫자 11자리만', async () => {
    const db = await newTestDb();
    const owner = await addUser(db);

    await expect(addInvitation(db, owner, '1234', 'abcdefghij')).rejects.toThrow();
    await expect(addInvitation(db, owner, '1234567890a', 'abcdefghij')).rejects.toThrow();
    await addInvitation(db, owner, '12345678901', 'abcdefghij');
  });

  it('원장 종류는 정한 8가지만', async () => {
    const db = await newTestDb();
    const user = await addUser(db);

    await expect(addLedger(db, user, 'L1', 'bonus', 50)).rejects.toThrow();
    await addLedger(db, user, 'L2', 'signup_bonus', 50);
  });

  it('잔액 뷰는 원장 합', async () => {
    const db = await newTestDb();
    const user = await addUser(db);

    await addLedger(db, user, 'L1', 'signup_bonus', 50);
    await addLedger(db, user, 'L2', 'activate', -50);
    await addLedger(db, user, 'L3', 'charge', 100);

    const [row] = await db.query<{ balance: number }>(
      'select balance::int as balance from letter_balances where user_id = $1',
      [user],
    );
    expect(row.balance).toBe(100);
  });

  it('운영자 역할은 admin 만', async () => {
    const db = await newTestDb();
    const add = (email: string, role: string) =>
      db.query(
        `insert into admins(email, name, password_hash, role) values ($1, '운영자', 'x', $2)`,
        [email, role],
      );

    await expect(add('o@example.com', 'owner')).rejects.toThrow();
    await add('a@example.com', 'admin');
  });
});
