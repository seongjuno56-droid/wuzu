import 'server-only';
import bcrypt from 'bcryptjs';
import { withAudit } from './audit';
import { getDb, type Db } from './db';
import { PATHNAME_HEADER, SESSION_COOKIE, verifySession } from './session';

/** 비밀번호 bcrypt 비용 */
const BCRYPT_COST = 10;
/** 비밀번호 최소 길이 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * 없는 계정·비활성 계정에도 bcrypt 비교를 한 번 하려고 쓰는 가짜 해시(비용 10).
 * 어떤 비밀번호와도 맞지 않는 임의 문자열의 해시다.
 */
const DUMMY_HASH = '$2b$10$1yJCaZwBRCHaPke8WHkL1.Fs4kjaHdM6OZeNMDMO1L7onA11GPUmG';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** 이메일은 저장·비교 모두 앞뒤 공백 없이 소문자로 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type LoginResult =
  | { ok: true; adminId: string; mustChangePassword: boolean }
  | { ok: false };

/**
 * 이메일·비밀번호 확인. 없는 이메일·비활성 계정도 bcrypt 비교를 한 번 해서
 * 응답 시간으로 계정이 있는지 알 수 없게 한다.
 */
export async function login(db: Db, email: string, password: string): Promise<LoginResult> {
  const [row] = await db.query<{ id: string; password_hash: string; active: boolean; must_change_password: boolean }>(
    `select id, password_hash, active, must_change_password
       from admins where lower(email) = $1`,
    [normalizeEmail(email)],
  );
  const matched = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !row.active || !matched) return { ok: false };

  await db.query(`update admins set last_login_at = now() where id = $1`, [row.id]);
  return { ok: true, adminId: row.id, mustChangePassword: row.must_change_password };
}

/** 쿠키 토큰의 서명을 확인하고, DB 에서 지금도 활성인 운영자인지까지 본다 */
export async function currentAdmin(db: Db, token: string | undefined): Promise<AdminRow | null> {
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || !UUID_RE.test(session.adminId)) return null;
  const [row] = await db.query<AdminRow>(
    `select ${ADMIN_COLUMNS} from admins where id = $1 and active`,
    [session.adminId],
  );
  return row ?? null;
}

/**
 * 서버 컴포넌트·서버 액션용. 로그인한 활성 운영자를 돌려준다.
 * 아니면 /login 으로, 비밀번호를 바꿔야 하면 /password 외 화면에서 /password 로 보낸다.
 * 지금 경로는 proxy 가 넣어 주는 요청 헤더로 안다.
 * next/headers·next/navigation 은 여기서만 불러온다. 맨 위에서 불러오면
 * 이 파일을 쓰는 scripts/create-admin.ts 가 Next 밖(tsx)에서 돌지 못한다.
 */
export async function requireAdmin(): Promise<AdminRow> {
  const { cookies, headers } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = await currentAdmin(await getDb(), token);
  if (!admin) return redirect('/login');
  if (admin.mustChangePassword) {
    const pathname = (await headers()).get(PATHNAME_HEADER);
    if (pathname !== '/password') return redirect('/password');
  }
  return admin;
}

export type ChangePasswordResult = 'ok' | 'wrong_current' | 'too_short';

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
