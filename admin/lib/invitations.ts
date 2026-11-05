import 'server-only';
import { withAudit } from './audit';
import type { Db } from './db';
import { isUuid } from './ids';
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
    const text = [`i.name`, `i.number`, `p.name`, `p.login_id`].map((c) => `${c} ilike ${p} escape '\\'`);
    // 회원 상세에서 복사한 회원 id 그대로도 찾는다
    if (isUuid(f.q)) {
      params.push(f.q);
      text.push(`i.owner_id = $${params.length}::uuid`);
    }
    conds.push(`(${text.join(' or ')})`);
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
  if (f.owner && isUuid(f.owner)) {
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

/** 초대장 목록: 이름·초대장No·만든 사람 이름·회원 아이디·회원 id 검색,테마·상태·숨김·만든 사람 걸러 보기, 최신순, 20개씩 */
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
  if (!isUuid(memberId)) return null;
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
  if (!isUuid(id)) return 'not_found';
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

/**
 * 초대장 삭제(되돌릴 수 없음). 방명록·참석 응답은 cascade 로 지워지고 파일은 삭제 대기열에 들어간다.
 * confirmName 을 주면 잠근 행의 이름과 비교한다(화면에서 다시 입력한 값). 앞뒤 공백은 무시한다.
 * 작업 기록에는 초대장 이름을 남기지 않는다. 지운 뒤에도 개인정보가 남지 않게 번호·회원 id·상태·기간·파일 수만 적는다.
 */
export async function deleteInvitation(
  db: Db,
  adminId: string,
  id: string,
  opts: { confirmName?: string; memo?: string } = {},
): Promise<'ok' | 'not_found' | 'name_mismatch'> {
  if (!isUuid(id)) return 'not_found';
  return withAudit(
    db,
    { adminId, action: 'invitation.delete', targetType: 'invitation', targetId: id, memo: opts.memo },
    async (tx) => {
      const [row] = await tx.query<{
        number: string;
        name: string;
        ownerId: string;
        themeId: string;
        status: string;
        activatedAt: Date | null;
        expiresAt: Date | null;
        banned: boolean;
      }>(
        `select number, name, owner_id as "ownerId", theme_id as "themeId", status,
                activated_at as "activatedAt", expires_at as "expiresAt", banned
           from invitations where id = $1 for update`,
        [id],
      );
      if (!row) return { before: null, after: null, changed: false, result: 'not_found' as const };
      if (opts.confirmName !== undefined && opts.confirmName.trim() !== row.name.trim()) {
        return { before: null, after: null, changed: false, result: 'name_mismatch' as const };
      }

      const [{ files }] = await tx.query<{ files: number }>(
        `select count(*)::int as files from media_files where invitation_id = $1 and deleted_at is null`,
        [id],
      );
      // 지우기 전에 표시한다. 지우고 나면 invitation_id 가 비어 파일을 찾을 수 없다
      await tx.query(`select public.mark_media_removed($1::uuid)`, [id]);
      await tx.query(`delete from invitations where id = $1`, [id]);
      return {
        before: {
          number: row.number,
          ownerId: row.ownerId,
          themeId: row.themeId,
          status: row.status,
          activatedAt: row.activatedAt,
          expiresAt: row.expiresAt,
          banned: row.banned,
          files,
        },
        after: null,
        changed: true,
        result: 'ok' as const,
      };
    },
  );
}

/**
 * 삭제 대기열이 막혔는지: 요청 뒤 이틀이 지나도 R2 에서 지우지 못한 파일 수와 가장 오래된 요청 시각.
 * 매일 새벽 지우므로 정상이면 0 이다. 키 모양이 틀려 건너뛴 파일과 계속 실패하는 파일이 여기에 잡힌다.
 */
export async function mediaPurgeBacklog(db: Db): Promise<{ stuck: number; oldest: Date | null }> {
  const [row] = await db.query<{ stuck: number; oldest: Date | null }>(
    `select count(*)::int as stuck, min(delete_requested_at) as oldest
       from media_files
      where delete_requested_at < now() - interval '2 days'
        and deleted_at is null`,
  );
  return row;
}
