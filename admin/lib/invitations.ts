import 'server-only';
import { withAudit } from './audit';
import type { Db } from './db';
import { INVITATION_STATES, THEMES, type InvitationState, type ThemeId } from './labels';
import { likePattern, PAGE_SIZE, safePage, type ListQuery } from './listQuery';

export type { InvitationState } from './labels';

/** CSV 로 내려받는 최대 줄 수 */
export const INVITATION_EXPORT_LIMIT = 5000;

/** 숨김 걸러 보기 값: 'true' 숨긴 것만, 'false' 숨기지 않은 것만 */
export const BANNED_FILTERS = ['true', 'false'] as const;

export interface InvitationRow {
  id: string;
  number: string;
  name: string;
  themeId: ThemeId;
  ownerId: string;
  ownerName: string;
  state: InvitationState;
  activatedAt: Date | null;
  expiresAt: Date | null;
  banned: boolean;
  createdAt: Date;
}

export interface InvitationFilter {
  q: string;
  theme?: string;
  state?: string;
  banned?: string;
  /** 만든 회원 id. uuid 가 아니면 무시 */
  owner?: string;
  /** 상태 계산 기준 시각 */
  now: Date;
}

/** 주소의 검색 값(parseListQuery 결과)에서 초대장 걸러 보기를 꺼낸다. 목록 화면과 CSV 가 함께 쓴다 */
export function invitationFilterFrom(query: ListQuery, now: Date): InvitationFilter {
  const f = query.filters;
  return { q: query.q, theme: f.theme, state: f.state, banned: f.banned, owner: f.owner, now };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isOneOf<T extends string>(list: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (list as readonly string[]).includes(value);
}

/** activated_at 없음 → draft, expires_at > now → active, 아니면 expired */
export function invitationState(
  row: { activatedAt: Date | null; expiresAt: Date | null },
  now: Date,
): InvitationState {
  if (!row.activatedAt) return 'draft';
  if (row.expiresAt && row.expiresAt.getTime() > now.getTime()) return 'active';
  return 'expired';
}

/** invitationState 와 같은 계산을 SQL 로. nowParam 은 timestamptz 매개변수 */
function stateSql(nowParam: string): string {
  return `case when i.activated_at is null then 'draft'
               when i.expires_at > ${nowParam}::timestamptz then 'active'
               else 'expired' end`;
}

/** 걸러 보기 조건. 모르는 테마·상태·숨김 값과 uuid 가 아닌 owner 는 무시한다 */
function invitationWhere(f: InvitationFilter): { where: string; params: unknown[] } {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (f.q) {
    params.push(likePattern(f.q));
    const p = `$${params.length}`;
    conds.push(`(i.name ilike ${p} escape '\\' or i.number ilike ${p} escape '\\' or p.name ilike ${p} escape '\\')`);
  }
  if (isOneOf(THEMES, f.theme)) {
    params.push(f.theme);
    conds.push(`i.theme_id = $${params.length}`);
  }
  if (isOneOf(INVITATION_STATES, f.state)) {
    params.push(f.now.toISOString(), f.state);
    conds.push(`(${stateSql(`$${params.length - 1}`)}) = $${params.length}`);
  }
  if (isOneOf(BANNED_FILTERS, f.banned)) {
    conds.push(f.banned === 'true' ? 'i.banned' : 'not i.banned');
  }
  if (f.owner && UUID_RE.test(f.owner)) {
    params.push(f.owner);
    conds.push(`i.owner_id = $${params.length}::uuid`);
  }
  return { where: conds.length > 0 ? `where ${conds.join(' and ')}` : '', params };
}

function selectInvitations(db: Db, f: InvitationFilter, limit: number, offset: number): Promise<InvitationRow[]> {
  const { where, params } = invitationWhere(f);
  params.push(f.now.toISOString());
  return db.query<InvitationRow>(
    `select i.id, i.number, i.name, i.theme_id as "themeId",
            i.owner_id as "ownerId", p.name as "ownerName",
            ${stateSql(`$${params.length}`)} as state,
            i.activated_at as "activatedAt", i.expires_at as "expiresAt",
            i.banned, i.created_at as "createdAt"
       from invitations i
       join profiles p on p.id = i.owner_id
       ${where}
      order by i.created_at desc, i.id desc
      limit ${limit} offset ${offset}`,
    params,
  );
}

/** 초대장 목록: 이름·초대장No·만든 사람 이름 검색, 테마·상태·숨김·만든 사람 걸러 보기, 최신순, 20개씩 */
export async function listInvitations(
  db: Db,
  q: InvitationFilter & { page: number },
): Promise<{ rows: InvitationRow[]; total: number }> {
  const { where, params } = invitationWhere(q);
  const [{ total }] = await db.query<{ total: number }>(
    `select count(*)::int as total
       from invitations i
       join profiles p on p.id = i.owner_id
       ${where}`,
    params,
  );
  const page = safePage(q.page);
  const rows = await selectInvitations(db, q, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { rows, total };
}

/** CSV 용: 같은 걸러 보기로 최대 INVITATION_EXPORT_LIMIT 줄 */
export function exportInvitations(db: Db, f: InvitationFilter): Promise<InvitationRow[]> {
  return selectInvitations(db, f, INVITATION_EXPORT_LIMIT, 0);
}

/** 만든 사람 걸러 보기에 보여 줄 회원 이름. 없거나 uuid 가 아니면 null */
export async function getInvitationOwnerName(db: Db, memberId: string): Promise<string | null> {
  if (!UUID_RE.test(memberId)) return null;
  const [row] = await db.query<{ name: string }>(`select name from profiles where id = $1`, [memberId]);
  return row?.name ?? null;
}

/**
 * 초대장 숨김(banned=true)·숨김 해제(false).
 * 이미 그 상태면 아무것도 바꾸지 않고 기록도 남기지 않는다.
 */
export async function setInvitationBanned(
  db: Db,
  adminId: string,
  id: string,
  banned: boolean,
  memo: string,
): Promise<'ok' | 'not_found'> {
  if (!UUID_RE.test(id)) return 'not_found';
  return withAudit(
    db,
    { adminId, action: banned ? 'invitation.hide' : 'invitation.unhide', targetType: 'invitation', targetId: id, memo },
    async (tx) => {
      const [row] = await tx.query<{ banned: boolean }>(
        `select banned from invitations where id = $1 for update`,
        [id],
      );
      if (!row) return { before: null, after: null, changed: false, result: 'not_found' as const };
      if (row.banned === banned) return { before: null, after: null, changed: false, result: 'ok' as const };

      await tx.query(`update invitations set banned = $1 where id = $2`, [banned, id]);
      return { before: { banned: row.banned }, after: { banned }, changed: true, result: 'ok' as const };
    },
  );
}
