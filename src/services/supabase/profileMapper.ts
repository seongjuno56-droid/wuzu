import type { AccountStatus, Gender, Provider, User } from '../types';

/** DB profiles 행 (PostgREST 가 돌려주는 모양) */
export interface ProfileRow {
  id: string | null;
  login_id: string | null;
  email: string | null;
  name: string | null;
  birth: string | null;
  gender: string | null;
  phone: string | null;
  provider: string | null;
  marketing_agreed: boolean | null;
  status: string | null;
  withdraw_requested_at: string | null;
  profile_updated_at: string | null;
  marketing_updated_at: string | null;
  created_at: string | null;
}

const USABLE_STATUSES: readonly string[] = ['active', 'withdrawing', 'banned'] satisfies AccountStatus[];

/**
 * timestamptz 문자열(마이크로초·+00:00)을 앱이 쓰는 ISO(밀리초·Z)로 바꾼다.
 * 소수 초를 3자리로 잘라 엔진마다 다른 파싱 차이를 피한다.
 */
export function toIso(ts: string): string {
  const ms = Date.parse(ts.replace(/(\.\d{3})\d+/, '$1'));
  if (Number.isNaN(ms)) throw new Error(`invalid_timestamp: ${ts}`);
  return new Date(ms).toISOString();
}

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const optIso = (v: string | null) => (v === null ? undefined : toIso(v));

/**
 * 프로필 행 → User. 쓸 수 없는 행이면 null:
 * - 행 없음 (my_profile 은 행이 없을 때 null 대신 모든 칸이 null 인 객체를 준다)
 * - 'withdrawn' (auth 사용자가 지워지므로 로그인한 회원에게 오면 안 되는 상태)
 */
export function profileToUser(row: ProfileRow | null | undefined): User | null {
  if (!row?.id || !row.status || !USABLE_STATUSES.includes(row.status)) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? '',
    birth: opt(row.birth),
    gender: opt(row.gender) as Gender | undefined,
    phone: opt(row.phone),
    provider: row.provider as Provider,
    marketingAgreed: !!row.marketing_agreed,
    createdAt: toIso(row.created_at!),
    loginId: opt(row.login_id),
    profileUpdatedAt: optIso(row.profile_updated_at),
    marketingUpdatedAt: optIso(row.marketing_updated_at),
    status: row.status as AccountStatus,
    withdrawRequestedAt: optIso(row.withdraw_requested_at),
  };
}
