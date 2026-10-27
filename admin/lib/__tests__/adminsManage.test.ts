import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import type { Db } from '../db';
import { createAdmin, listAdmins, setAdminActive } from '../admins';
import { addAdmin, newTestDb } from '../../test/db';

async function auditActions(db: Db): Promise<{ action: string; targetId: string; before: unknown; after: unknown }[]> {
  return db.query(
    `select action, target_id as "targetId", before, after from admin_audit_logs order by id`,
  );
}

describe('운영자 추가', () => {
  it('새 운영자는 비밀번호를 바꿔야 하는 상태로 만들어지고 작업 기록이 남는다', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');

    expect(await createAdmin(db, boss, { email: '  New@Wuzu.kr ', name: ' 새 운영자 ', tempPassword: 'temp-pass-01' })).toBe('ok');

    const [row] = await db.query<{ id: string; email: string; name: string; must_change_password: boolean; active: boolean; password_hash: string }>(
      `select id, email, name, must_change_password, active, password_hash from admins where email = 'new@wuzu.kr'`,
    );
    expect(row).toMatchObject({ name: '새 운영자', must_change_password: true, active: true });
    expect(await bcrypt.compare('temp-pass-01', row.password_hash)).toBe(true);

    const logs = await auditActions(db);
    expect(logs).toEqual([
      { action: 'admin.create', targetId: row.id, before: null, after: { email: 'new@wuzu.kr', name: '새 운영자' } },
    ]);
    // 작업 기록에 비밀번호가 남지 않는다
    expect(JSON.stringify(logs)).not.toContain('temp-pass-01');
  });

  it('같은 이메일(대소문자 달라도) 두 번이면 duplicate', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');
    expect(await createAdmin(db, boss, { email: 'dup@wuzu.kr', name: '하나', tempPassword: 'temp-pass-01' })).toBe('ok');
    expect(await createAdmin(db, boss, { email: 'DUP@Wuzu.KR', name: '둘', tempPassword: 'temp-pass-02' })).toBe('duplicate');
    expect(await createAdmin(db, boss, { email: 'Boss@wuzu.kr', name: '셋', tempPassword: 'temp-pass-03' })).toBe('duplicate');

    const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from admins`);
    expect(n).toBe(2);
    expect((await auditActions(db)).map((l) => l.action)).toEqual(['admin.create']);
  });

  it('임시 비밀번호 9자면 too_short', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');
    expect(await createAdmin(db, boss, { email: 'short@wuzu.kr', name: '짧음', tempPassword: '123456789' })).toBe('too_short');
    expect(await createAdmin(db, boss, { email: 'short@wuzu.kr', name: '열 자', tempPassword: '1234567890' })).toBe('ok');
  });
});

describe('운영자 비활성화·재활성화', () => {
  it('마지막 활성 운영자는 비활성화 못 함 — 자기 자신이어도', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');
    const other = await addAdmin(db, 'other@wuzu.kr', '다른');

    // 다른 운영자를 끄면 활성은 boss 한 명
    expect(await setAdminActive(db, boss, other, false)).toBe('ok');
    // 자기 자신(마지막 활성)을 끄려 하면 막힌다
    expect(await setAdminActive(db, boss, boss, false)).toBe('last_admin');

    const [row] = await db.query<{ active: boolean }>(`select active from admins where id = $1`, [boss]);
    expect(row.active).toBe(true);
    expect((await auditActions(db)).map((l) => l.action)).toEqual(['admin.deactivate']);

    // 둘 다 활성이면 자기 자신도 끌 수 있다
    expect(await setAdminActive(db, boss, other, true)).toBe('ok');
    expect(await setAdminActive(db, boss, boss, false)).toBe('ok');
  });

  it('비활성화·재활성화 작업 기록', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');
    const other = await addAdmin(db, 'other@wuzu.kr', '다른');

    expect(await setAdminActive(db, boss, other, false)).toBe('ok');
    // 이미 꺼져 있으면 바꾸지 않고 기록도 남기지 않는다
    expect(await setAdminActive(db, boss, other, false)).toBe('ok');
    expect(await setAdminActive(db, boss, other, true)).toBe('ok');

    expect(await auditActions(db)).toEqual([
      { action: 'admin.deactivate', targetId: other, before: { active: true }, after: { active: false } },
      { action: 'admin.reactivate', targetId: other, before: { active: false }, after: { active: true } },
    ]);
  });

  it('없는 운영자·잘못된 id 는 not_found', async () => {
    const db = await newTestDb();
    const boss = await addAdmin(db, 'boss@wuzu.kr', '대표');
    expect(await setAdminActive(db, boss, 'not-a-uuid', false)).toBe('not_found');
    expect(await setAdminActive(db, boss, '00000000-0000-0000-0000-000000000000', true)).toBe('not_found');
    expect(await auditActions(db)).toEqual([]);
  });
});

describe('운영자 목록', () => {
  it('비밀번호 해시 없이 만든 순서대로', async () => {
    const db = await newTestDb();
    const a = await addAdmin(db, 'a@wuzu.kr', '가');
    const b = await addAdmin(db, 'b@wuzu.kr', '나');
    await setAdminActive(db, a, b, false);

    const rows = await listAdmins(db);
    expect(rows.map((r) => [r.id, r.email, r.active])).toEqual([
      [a, 'a@wuzu.kr', true],
      [b, 'b@wuzu.kr', false],
    ]);
    expect(rows[0]).not.toHaveProperty('passwordHash');
    expect(rows[0]).not.toHaveProperty('password_hash');
  });
});
