import { describe, expect, it } from 'vitest';
import { newTestDb } from '../../test/db';
import { login } from '../admins';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, seedIfEmpty } from '../seed';

async function count(db: Awaited<ReturnType<typeof newTestDb>>, table: string): Promise<number> {
  const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from ${table}`);
  return n;
}

describe('seedIfEmpty', () => {
  it('DATABASE_URL 이 있으면 빈 DB 라도 아무것도 넣지 않는다', async () => {
    const db = await newTestDb();
    expect(await seedIfEmpty(db, 'postgres://real-db')).toBe(false);
    expect(await count(db, 'admins')).toBe(0);
    expect(await count(db, 'profiles')).toBe(0);
  });

  it('운영자가 이미 있으면 넣지 않는다', async () => {
    const db = await newTestDb();
    await db.query(`insert into admins(email, name, password_hash) values ('x@wuzu.kr', '가', 'x')`);
    expect(await seedIfEmpty(db, undefined)).toBe(false);
    expect(await count(db, 'profiles')).toBe(0);
  });

  it('로컬 빈 DB 에 시드를 넣고, 두 번째에는 넣지 않는다', async () => {
    const db = await newTestDb();
    expect(await seedIfEmpty(db, undefined)).toBe(true);

    const result = await login(db, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    expect(result).toMatchObject({ ok: true, mustChangePassword: false });

    // 회원 30명: 경로 4종·상태 3종, 검색 특수문자 확인용 이름 하나
    expect(await count(db, 'profiles')).toBe(30);
    const providers = await db.query<{ provider: string }>(`select distinct provider from profiles`);
    expect(providers).toHaveLength(4);
    const statuses = await db.query<{ status: string }>(`select distinct status from profiles`);
    expect(statuses).toHaveLength(3);
    const special = await db.query(`select 1 from profiles where name = $1`, ['50%_a\\']);
    expect(special).toHaveLength(1);
    // 회원마다 auth.users 가 먼저 있다(외래 키)
    expect(await count(db, 'auth.users')).toBe(30);

    // 초대장 40개: 테마 4종·상태 3종(작성 중·활성·만료)·2개 숨김
    expect(await count(db, 'invitations')).toBe(40);
    const themes = await db.query(`select distinct theme_id from invitations`);
    expect(themes).toHaveLength(4);
    const states = await db.query(
      `select distinct case when activated_at is null then 'draft'
                            when expires_at > now() then 'active' else 'expired' end as s
         from invitations`,
    );
    expect(states).toHaveLength(3);
    const [{ n: hidden }] = await db.query<{ n: number }>(`select count(*)::int as n from invitations where banned`);
    expect(hidden).toBe(2);

    // 원장: 가입 50(회원마다)·충전·사용, 잔액은 음수가 아니다
    const bonus = await db.query<{ total: number }>(`select total from ledger_entries where kind = 'signup_bonus'`);
    expect(bonus).toHaveLength(30);
    expect(bonus.every((b) => b.total === 50)).toBe(true);
    const kinds = await db.query<{ kind: string }>(`select distinct kind from ledger_entries`);
    expect(kinds.map((k) => k.kind).sort()).toEqual(['activate', 'charge', 'signup_bonus']);
    const [{ n: negative }] = await db.query<{ n: number }>(
      `select count(*)::int as n from letter_balances where balance < 0`,
    );
    expect(negative).toBe(0);

    expect(await seedIfEmpty(db, undefined)).toBe(false);
    expect(await count(db, 'profiles')).toBe(30);
  });
});
