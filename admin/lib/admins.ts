import 'server-only';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { withAudit } from './audit';
import { getDb, type Db } from './db';
import { isUuid } from './ids';
import { SESSION_COOKIE, verifySession } from './session';

/** 비밀번호 bcrypt 비용 */
const BCRYPT_COST = 10;
/** 비밀번호 최소 길이 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * 없는 계정·비활성 계정에도 bcrypt 비교를 한 번 하려고 쓰는 가짜 해시(비용 10).
 * 어떤 비밀번호와도 맞지 않는 임의 문자열의 해시다.
 */
const DUMMY_HASH = '$2b$10$1yJCaZwBRCHaPke8WHkL1.Fs4kjaHdM6OZeNMDMO1L7onA11GPUmG';

/** 화면에 돌려주는 운영자 정보. 비밀번호 해시는 담지 않는다 */
export interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

const ADMIN_COLUMNS = `id, email, name, role, active,
  must_change_password as "mustChangePassword",
  created_at as "createdAt", last_login_at as "lastLoginAt"`;

/** 이메일은 저장·비교 모두 앞뒤 공백 없이 소문자로. 저장된 값은 늘 이 모양이다 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 연달아 이만큼 틀리면 잠근다 */
export const MAX_FAILED_LOGINS = 10;
/** 잠그는 시간(분) */
export const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; adminId: string; mustChangePassword: boolean }
  | { ok: false; reason: 'invalid' | 'locked' };

/**
 * 이메일·비밀번호 확인. 없는 이메일·비활성 계정도 bcrypt 비교를 한 번 해서
 * 응답 시간으로 계정이 있는지 알 수 없게 한다(없는 이메일은 늘 invalid).
 * 잠긴 계정(locked_until > now)은 비밀번호를 보지 않고 locked.
 * 틀리면 failed_login_count 를 올리고, 10번째(MAX_FAILED_LOGINS)에 15분(LOCK_MINUTES) 잠그며 카운트를 0 으로 돌린다.
 * 맞으면 카운트 0·잠금 해제. now 는 테스트에서 시간을 정하려고 받는다.
 */
export async function login(db: Db, email: string, password: string, now: Date = new Date()): Promise<LoginResult> {
  const [row] = await db.query<{
    id: string;
    password_hash: string;
    active: boolean;
    must_change_password: boolean;
    locked_until: Date | null;
  }>(
    `select id, password_hash, active, must_change_password, locked_until
       from admins where email = $1`,
    [normalizeEmail(email)],
  );
  if (row?.locked_until && row.locked_until.getTime() > now.getTime()) return { ok: false, reason: 'locked' };

  const matched = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !row.active) return { ok: false, reason: 'invalid' };
  if (!matched) {
    // 한 문장으로 올려 동시에 틀려도 카운트를 잃지 않는다. 그 사이 잠겼으면 세지 않는다
    await db.query(
      `update admins set
         failed_login_count = case when failed_login_count + 1 >= $3 then 0 else failed_login_count + 1 end,
         locked_until = case when failed_login_count + 1 >= $3
                             then $2::timestamptz + make_interval(mins => $4) else locked_until end
       where id = $1 and (locked_until is null or locked_until <= $2)`,
      [row.id, now, MAX_FAILED_LOGINS, LOCK_MINUTES],
    );
    return { ok: false, reason: 'invalid' };
  }

  await db.query(
    `update admins set last_login_at = $2, failed_login_count = 0, locked_until = null where id = $1`,
    [row.id, now],
  );
  return { ok: true, adminId: row.id, mustChangePassword: row.must_change_password };
}

/** 쿠키 토큰의 서명을 확인하고, DB 에서 지금도 활성인 운영자인지까지 본다 */
export async function currentAdmin(db: Db, token: string | undefined): Promise<AdminRow | null> {
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || !isUuid(session.adminId)) return null;
  const [row] = await db.query<AdminRow>(
    `select ${ADMIN_COLUMNS} from admins where id = $1 and active`,
    [session.adminId],
  );
  return row ?? null;
}

/**
 * 서버 컴포넌트·서버 액션용. 로그인한 활성 운영자를 돌려준다.
 * 아니면 /login 으로 보낸다. 비밀번호를 바꿔야 하는 운영자는 /password 로 보낸다.
 * allowPasswordChange 는 비밀번호 변경 화면과 그 서버 액션에서만 true 로 쓴다.
 * (요청 경로로 판단하면 서버 액션 id 만 바꿔 POST /password 로 다른 액션을 실행할 수 있다)
 * next/headers·next/navigation 은 여기서만 불러온다. 맨 위에서 불러오면
 * 이 파일을 쓰는 scripts/create-admin.ts 가 Next 밖(tsx)에서 돌지 못한다.
 */
export async function requireAdmin(opts: { allowPasswordChange?: boolean } = {}): Promise<AdminRow> {
  const { cookies } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = await currentAdmin(await getDb(), token);
  if (!admin) return redirect('/login');
  if (admin.mustChangePassword && !opts.allowPasswordChange) return redirect('/password');
  return admin;
}

export type ChangePasswordResult = 'ok' | 'wrong_current' | 'too_short' | 'same_as_current';

/**
 * 비밀번호 변경. 성공하면 must_change_password 를 끄고 작업 기록을 남긴다.
 * 작업 기록에는 비밀번호도 해시도 넣지 않는다.
 */
export async function changePassword(
  db: Db,
  adminId: string,
  current: string,
  next: string,
): Promise<ChangePasswordResult> {
  const [row] = await db.query<{ password_hash: string; must_change_password: boolean }>(
    `select password_hash, must_change_password from admins where id = $1 and active`,
    [adminId],
  );
  const matched = await bcrypt.compare(current, row?.password_hash ?? DUMMY_HASH);
  if (!row || !matched) return 'wrong_current';
  if (next.length < MIN_PASSWORD_LENGTH) return 'too_short';
  if (next === current) return 'same_as_current';

  const hash = await bcrypt.hash(next, BCRYPT_COST);
  return withAudit(
    db,
    { adminId, action: 'admin.password_change', targetType: 'admin', targetId: adminId },
    async (tx) => {
      await tx.query(
        `update admins set password_hash = $1, must_change_password = false where id = $2`,
        [hash, adminId],
      );
      return {
        before: { mustChangePassword: row.must_change_password },
        after: { mustChangePassword: false },
        changed: true,
        result: 'ok' as const,
      };
    },
  );
}

/**
 * 처음 운영자를 만든다(scripts/create-admin.ts 용). 바로 쓰도록 must_change_password=false.
 * 운영자가 아직 없으므로 작업 기록은 남기지 않는다.
 */
export async function createFirstAdmin(
  db: Db,
  email: string,
  name: string,
  password: string,
): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) throw new Error('이메일 모양이 아닙니다.');
  if (!name.trim()) throw new Error('이름을 넣어 주세요.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const [row] = await db.query<{ id: string }>(
    `insert into admins(email, name, password_hash, must_change_password)
     values ($1, $2, $3, false) returning id`,
    [normalized, name.trim(), hash],
  );
  return row.id;
}

/** 운영자 목록: 만든 순서대로. 비밀번호 해시는 담지 않는다 */
export function listAdmins(db: Db): Promise<AdminRow[]> {
  return db.query<AdminRow>(`select ${ADMIN_COLUMNS} from admins order by created_at, id`);
}

export type CreateAdminResult = 'ok' | 'duplicate' | 'too_short';

/**
 * 운영자 추가. 처음 로그인하면 비밀번호를 바꾸도록 must_change_password=true.
 * 이메일은 소문자로 저장하므로 대소문자만 다른 이메일도 duplicate.
 * 작업 기록에는 이메일·이름만 남기고 비밀번호는 넣지 않는다.
 * 이메일 모양·이름 빈칸은 부르는 쪽(서버 액션)에서 먼저 확인한다.
 */
export async function createAdmin(
  db: Db,
  byAdminId: string,
  input: { email: string; name: string; tempPassword: string },
): Promise<CreateAdminResult> {
  if (input.tempPassword.length < MIN_PASSWORD_LENGTH) return 'too_short';
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const hash = await bcrypt.hash(input.tempPassword, BCRYPT_COST);
  // 작업 기록 대상 id 를 미리 정해 두려고 id 를 여기서 만든다
  const id = randomUUID();
  return withAudit(
    db,
    { adminId: byAdminId, action: 'admin.create', targetType: 'admin', targetId: id },
    async (tx) => {
      // 동시에 같은 이메일을 넣어도 unique 제약에 걸려 한쪽만 들어간다
      const inserted = await tx.query<{ id: string }>(
        `insert into admins(id, email, name, password_hash, must_change_password)
         values ($1, $2, $3, $4, true)
         on conflict (email) do nothing
         returning id`,
        [id, email, name, hash],
      );
      if (inserted.length === 0) {
        return { before: null, after: null, changed: false, result: 'duplicate' as const };
      }
      return { before: null, after: { email, name }, changed: true, result: 'ok' as const };
    },
  );
}

export type SetAdminActiveResult = 'ok' | 'last_admin' | 'not_found';

/**
 * 운영자 비활성화(active=false)·다시 켜기(true). 자기 자신도 같은 규칙.
 * 끄고 나면 활성 운영자가 0명이 되는 경우는 last_admin 으로 막는다.
 * 이미 그 상태면 아무것도 바꾸지 않고 기록도 남기지 않는다.
 */
export async function setAdminActive(
  db: Db,
  byAdminId: string,
  targetId: string,
  active: boolean,
): Promise<SetAdminActiveResult> {
  if (!isUuid(targetId)) return 'not_found';
  return withAudit(
    db,
    {
      adminId: byAdminId,
      action: active ? 'admin.reactivate' : 'admin.deactivate',
      targetType: 'admin',
      targetId,
    },
    async (tx) => {
      const unchanged = (result: SetAdminActiveResult) => ({ before: null, after: null, changed: false, result });
      // 활성 운영자를 모두 잠가, 두 운영자가 동시에 서로를 꺼서 0명이 되는 일을 막는다
      const activeIds = await tx.query<{ id: string }>(
        `select id from admins where active order by id for update`,
      );
      const [row] = await tx.query<{ active: boolean }>(
        `select active from admins where id = $1 for update`,
        [targetId],
      );
      if (!row) return unchanged('not_found');
      if (row.active === active) return unchanged('ok');
      if (!active && activeIds.length <= 1) return unchanged('last_admin');

      await tx.query(`update admins set active = $1 where id = $2`, [active, targetId]);
      return { before: { active: row.active }, after: { active }, changed: true, result: 'ok' as const };
    },
  );
}
