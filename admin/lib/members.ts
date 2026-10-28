import 'server-only';
import { withAudit } from './audit';
import type { Db } from './db';
import { isUuid } from './ids';
import { MEMBER_STATUSES, type MemberStatus } from './labels';
import { likePattern, PAGE_SIZE, safePage, type ListQuery } from './listQuery';

// 회원 상태 값·표시 문구는 작업 기록 요약도 쓰므로 labels.ts 에 있다
export { MEMBER_STATUS_LABEL, MEMBER_STATUSES, type MemberStatus } from './labels';

export const PROVIDERS = ['email', 'kakao', 'google', 'apple'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
  apple: '애플',
};

/** CSV 로 내려받는 최대 줄 수 */
export const MEMBER_EXPORT_LIMIT = 5000;

export interface MemberRow {
  id: string;
  loginId: string | null;
  email: string | null;
  name: string;
  provider: Provider;
  status: MemberStatus;
  createdAt: Date;
  balance: number;
  invitationCount: number;
}

export interface MemberInvitation {
  id: string;
  number: string;
  name: string;
  themeId: string;
  status: string;
  banned: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface MemberLedgerEntry {
  id: string;
  number: string;
  kind: string;
  title: string;
  total: number;
  createdAt: Date;
}

export interface MemberDetail extends MemberRow {
  /** 'YYYY-MM-DD' */
  birth: string | null;
  gender: string | null;
  phone: string | null;
  marketingAgreed: boolean;
  withdrawRequestedAt: Date | null;
  profileUpdatedAt: Date | null;
  marketingUpdatedAt: Date | null;
  /** 최근 초대장 MEMBER_DETAIL_INVITATIONS 개 (전체 수는 invitationCount) */
  invitations: MemberInvitation[];
  /** 최근 원장 20줄 */
  ledger: MemberLedgerEntry[];
}

export interface MemberFilter {
  q: string;
  status?: string;
  provider?: string;
}

/** 주소의 검색 값(parseListQuery 결과)에서 회원 걸러 보기를 꺼낸다. 목록 화면과 CSV 가 함께 쓴다 */
export function memberFilterFrom(query: ListQuery): MemberFilter {
  return { q: query.q, status: query.filters.status, provider: query.filters.provider };
}

/** 상세 화면에 보여 주는 최근 초대장 수 */
export const MEMBER_DETAIL_INVITATIONS = 20;
const MEMBER_DETAIL_LEDGER = 20;

const MEMBER_COLUMNS = `p.id, p.login_id as "loginId", p.email, p.name, p.provider, p.status,
  p.created_at as "createdAt",
  coalesce(b.balance, 0)::int as balance,
  (select count(*)::int from invitations i where i.owner_id = p.id) as "invitationCount"`;

function isOneOf<T extends string>(list: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (list as readonly string[]).includes(value);
}

/** 걸러 보기 조건. 모르는 상태·경로 값은 무시한다 */
function memberWhere(f: MemberFilter): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (f.q) {
    params.push(likePattern(f.q));
    const p = `$${params.length}`;
    conds.push(`(p.name ilike ${p} escape '\\' or p.email ilike ${p} escape '\\' or p.login_id ilike ${p} escape '\\')`);
  }
  if (isOneOf(MEMBER_STATUSES, f.status)) {
    params.push(f.status);
    conds.push(`p.status = $${params.length}`);
  }
  if (isOneOf(PROVIDERS, f.provider)) {
    params.push(f.provider);
    conds.push(`p.provider = $${params.length}`);
  }
  return { where: conds.length > 0 ? `where ${conds.join(' and ')}` : '', params };
}

function selectMembers(db: Db, f: MemberFilter, limit: number, offset: number): Promise<MemberRow[]> {
  const { where, params } = memberWhere(f);
  return db.query<MemberRow>(
    `select ${MEMBER_COLUMNS}
       from profiles p
       left join letter_balances b on b.user_id = p.id
       ${where}
      order by p.created_at desc, p.id desc
      limit ${limit} offset ${offset}`,
    params,
  );
}

/** 회원 목록: 이름·이메일·아이디 검색, 상태·가입 경로 걸러 보기, 최신 가입순, 20개씩 */
export async function listMembers(
  db: Db,
  q: MemberFilter & { page: number },
): Promise<{ rows: MemberRow[]; total: number }> {
  const { where, params } = memberWhere(q);
  const [{ total }] = await db.query<{ total: number }>(
    `select count(*)::int as total from profiles p ${where}`,
    params,
  );
  const page = safePage(q.page);
  const rows = await selectMembers(db, q, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { rows, total };
}

/** CSV 용: 같은 걸러 보기로 최대 MEMBER_EXPORT_LIMIT 줄 */
export function exportMembers(db: Db, f: MemberFilter): Promise<MemberRow[]> {
  return selectMembers(db, f, MEMBER_EXPORT_LIMIT, 0);
}

/** 회원 상세: 정보·잔액·최근 초대장·최근 원장 20줄. 없으면 null */
export async function getMember(db: Db, id: string): Promise<MemberDetail | null> {
  if (!isUuid(id)) return null;
  const [m] = await db.query<Omit<MemberDetail, 'invitations' | 'ledger'>>(
    `select ${MEMBER_COLUMNS},
            p.birth::text as birth, p.gender, p.phone,
            p.marketing_agreed as "marketingAgreed",
            p.withdraw_requested_at as "withdrawRequestedAt",
            p.profile_updated_at as "profileUpdatedAt",
            p.marketing_updated_at as "marketingUpdatedAt"
       from profiles p
       left join letter_balances b on b.user_id = p.id
      where p.id = $1`,
    [id],
  );
  if (!m) return null;

  const invitations = await db.query<MemberInvitation>(
    `select id, number, name, theme_id as "themeId", status, banned,
            expires_at as "expiresAt", created_at as "createdAt"
       from invitations where owner_id = $1
      order by created_at desc, id desc
      limit ${MEMBER_DETAIL_INVITATIONS}`,
    [id],
  );
  const ledger = await db.query<MemberLedgerEntry>(
    `select id, number, kind, title, total, created_at as "createdAt"
       from ledger_entries where user_id = $1
      order by created_at desc, id desc
      limit ${MEMBER_DETAIL_LEDGER}`,
    [id],
  );
  return { ...m, invitations, ledger };
}

export type SetBannedResult = 'ok' | 'not_found' | 'withdrawing' | 'withdrawn';

/**
 * 회원 정지(banned=true)·해제(false). 탈퇴 진행 중·탈퇴 완료 회원은 바꾸지 않는다.
 * 이미 그 상태면 아무것도 바꾸지 않고 기록도 남기지 않는다.
 */
export async function setMemberBanned(
  db: Db,
  adminId: string,
  memberId: string,
  banned: boolean,
  memo: string,
): Promise<SetBannedResult> {
  if (!isUuid(memberId)) return 'not_found';
  return withAudit(
    db,
    { adminId, action: banned ? 'member.ban' : 'member.unban', targetType: 'member', targetId: memberId, memo },
    async (tx) => {
      const [row] = await tx.query<{ status: MemberStatus }>(
        `select status from profiles where id = $1 for update`,
        [memberId],
      );
      const unchanged = (result: SetBannedResult) => ({ before: null, after: null, changed: false, result });
      if (!row) return unchanged('not_found');
      if (row.status === 'withdrawing') return unchanged('withdrawing');
      if (row.status === 'withdrawn') return unchanged('withdrawn');
      const next: MemberStatus = banned ? 'banned' : 'active';
      if (row.status === next) return unchanged('ok');

      await tx.query(`update profiles set status = $1 where id = $2`, [next, memberId]);
      return { before: { status: row.status }, after: { status: next }, changed: true, result: 'ok' as const };
    },
  );
}
