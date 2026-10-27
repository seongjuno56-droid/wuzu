import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { Db } from '../db';
import { changePassword, createFirstAdmin, currentAdmin, login } from '../admins';
import { signSession } from '../session';
import { newTestDb } from '../../test/db';

const PASSWORD = 'correct-horse-battery';

/** 운영자 한 명을 만들고 id 를 돌려준다 */
async function addAdmin(
  db: Db,
  email: string,
  opts: { active?: boolean; mustChangePassword?: boolean } = {},
): Promise<string> {
  const [a] = await db.query<{ id: string }>(
    `insert into admins(email, name, password_hash, active, must_change_password)
     values ($1, '운영자', $2, $3, $4) returning id`,
    [email, await bcrypt.hash(PASSWORD, 4), opts.active ?? true, opts.mustChangePassword ?? true],
  );
  return a.id;
}

describe('운영자 로그인·세션', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret-0123456789-abcdefghijklmnop');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('맞는 비밀번호면 로그인, 틀리면 실패, 대문자 이메일도 같은 계정', async () => {
    const db = await newTestDb();
    const id = await addAdmin(db, 'boss@wuzu.kr', { mustChangePassword: true });

    expect(await login(db, 'boss@wuzu.kr', PASSWORD)).toEqual({
      ok: true,
      adminId: id,
      mustChangePassword: true,
    });
    expect(await login(db, '  Boss@WUZU.kr ', PASSWORD)).toMatchObject({ ok: true, adminId: id });
    expect(await login(db, 'boss@wuzu.kr', 'wrong-password')).toEqual({ ok: false });
    expect(await login(db, 'nobody@wuzu.kr', PASSWORD)).toEqual({ ok: false });

    const [row] = await db.query<{ last_login_at: Date | null }>(
      `select last_login_at from admins where id = $1`,
      [id],
    );
    expect(row.last_login_at).not.toBeNull();
  });

  it('비활성 운영자는 로그인 실패', async () => {
    const db = await newTestDb();
    const id = await addAdmin(db, 'gone@wuzu.kr', { active: false });
    expect(await login(db, 'gone@wuzu.kr', PASSWORD)).toEqual({ ok: false });
    const [row] = await db.query<{ last_login_at: Date | null }>(
      `select last_login_at from admins where id = $1`,
      [id],
    );
    expect(row.last_login_at).toBeNull();
  });

  it('비활성화되면 들고 있던 세션도 currentAdmin 이 null', async () => {
    const db = await newTestDb();
    const id = await addAdmin(db, 'boss@wuzu.kr');
    const token = await signSession(id);

    const before = await currentAdmin(db, token);
    expect(before).toMatchObject({ id, email: 'boss@wuzu.kr', active: true });
    expect(before).not.toHaveProperty('passwordHash');
    expect(before).not.toHaveProperty('password_hash');

    await db.query(`update admins set active = false where id = $1`, [id]);
    expect(await currentAdmin(db, token)).toBeNull();
    expect(await currentAdmin(db, undefined)).toBeNull();
    expect(await currentAdmin(db, 'garbage')).toBeNull();
  });

  it('비밀번호 변경: 현재 비밀번호 틀리면 wrong_current, 9자면 too_short, 성공하면 must_change_password false 와 작업 기록 한 줄', async () => {
    const db = await newTestDb();
    const id = await addAdmin(db, 'boss@wuzu.kr', { mustChangePassword: true });

    expect(await changePassword(db, id, 'wrong-current', 'new-password-123')).toBe('wrong_current');
    expect(await changePassword(db, id, PASSWORD, '123456789')).toBe('too_short');

    const [{ n: logsBefore }] = await db.query<{ n: number }>(
      `select count(*)::int as n from admin_audit_logs`,
    );
    expect(logsBefore).toBe(0);

    expect(await changePassword(db, id, PASSWORD, 'new-password-123')).toBe('ok');

    const [row] = await db.query<{ must_change_password: boolean }>(
      `select must_change_password from admins where id = $1`,
      [id],
    );
    expect(row.must_change_password).toBe(false);
    expect(await login(db, 'boss@wuzu.kr', PASSWORD)).toEqual({ ok: false });
    expect(await login(db, 'boss@wuzu.kr', 'new-password-123')).toMatchObject({
      ok: true,
      mustChangePassword: false,
    });

    const logs = await db.query<{ admin_id: string; action: string; target_type: string; target_id: string; before: unknown; after: unknown }>(
      `select admin_id, action, target_type, target_id, before, after from admin_audit_logs`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      admin_id: id,
      action: 'admin.password_change',
      target_type: 'admin',
      target_id: id,
    });
    const logText = JSON.stringify(logs[0]);
    expect(logText).not.toContain('new-password-123');
    expect(logText).not.toContain(PASSWORD);
    expect(logText).not.toMatch(/\$2[aby]\$/);
  });

  it('첫 운영자 만들기: 이메일은 소문자로, 바로 쓸 수 있는 상태', async () => {
    const db = await newTestDb();
    const id = await createFirstAdmin(db, ' Boss@WUZU.kr ', '대표', 'first-password-1');
    const [row] = await db.query<{ email: string; must_change_password: boolean; password_hash: string }>(
      `select email, must_change_password, password_hash from admins where id = $1`,
      [id],
    );
    expect(row.email).toBe('boss@wuzu.kr');
    expect(row.must_change_password).toBe(false);
    expect(row.password_hash).not.toContain('first-password-1');
    expect(await login(db, 'boss@wuzu.kr', 'first-password-1')).toMatchObject({ ok: true, adminId: id });
    await expect(createFirstAdmin(db, 'x@wuzu.kr', '짧음', '123456789')).rejects.toThrow(/10자/);
  });
});
