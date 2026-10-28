import 'server-only';
import type { Db } from './db';
import { isUuid } from './ids';
import { PAGE_SIZE, safePage, type ListQuery } from './listQuery';

export type AuditAction =
  | 'member.ban'
  | 'member.unban'
  | 'invitation.hide'
  | 'invitation.unhide'
  | 'admin.create'
  | 'admin.deactivate'
  | 'admin.reactivate'
  | 'admin.password_change';

export type AuditTargetType = 'member' | 'invitation' | 'admin';

export interface AuditEntry {
  adminId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  memo?: string;
}

export interface AuditChange<R> {
  before: unknown;
  after: unknown;
  /** false 면 실제로 바뀐 것이 없으므로 기록하지 않는다 */
  changed: boolean;
  result: R;
}

export interface AuditRow {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  memo: string | null;
  createdAt: Date;
}

export interface AuditFilter {
  adminId?: string;
  action?: string;
  targetType?: string;
  /** 'YYYY-MM-DD', 한국 시간 그날 0시부터 */
  from?: string;
  /** 'YYYY-MM-DD', 한국 시간 그날 끝까지 포함 */
  to?: string;
}

export type AuditListQuery = AuditFilter & { page: number };

/** CSV 로 내려받는 최대 줄 수 */
export const AUDIT_EXPORT_LIMIT = 5000;

/**
 * 주소의 검색 값(parseListQuery 결과)에서 작업 기록 걸러 보기를 꺼낸다. 목록 화면과 CSV 가 함께 쓴다.
 * 주소 이름: admin(운영자 id)·action·target(대상 종류)·from·to
 */
export function auditFilterFrom(query: ListQuery): AuditFilter {
  const f = query.filters;
  return { adminId: f.admin, action: f.action, targetType: f.target, from: f.from, to: f.to };
}

/** jsonb 매개변수로 보낼 값. null·undefined 는 SQL NULL 로 */
function toJson(value: unknown): string | null {
  return value == null ? null : JSON.stringify(value);
}

/** 'YYYY-MM-DD' 모양이고 달력에 실제로 있는 날짜인지 */
function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * change 와 작업 기록 insert 를 한 트랜잭션으로 실행한다.
 * 어느 쪽이 실패해도 둘 다 되돌아간다.
 */
export function withAudit<R>(
  db: Db,
  entry: AuditEntry,
  change: (tx: Db) => Promise<AuditChange<R>>,
): Promise<R> {
  return db.tx(async (tx) => {
    const { before, after, changed, result } = await change(tx);
    if (changed) {
      await tx.query(
        `insert into admin_audit_logs(admin_id, action, target_type, target_id, before, after, memo)
         values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [
          entry.adminId,
          entry.action,
          entry.targetType,
          entry.targetId,
          toJson(before),
          toJson(after),
          entry.memo ?? null,
        ],
      );
    }
    return result;
  });
}

/**
 * 걸러 보기 조건. 주소에서 온 값이 잘못된 모양(uuid·날짜)이면 그 걸러 보기만 뺀다.
 * 날짜는 세션 시간대와 상관없이 한국 시간 하루 기준.
 */
function auditWhere(f: AuditFilter): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (p: string) => string, value: unknown) => {
    params.push(value);
    conds.push(sql(`$${params.length}`));
  };
  if (f.adminId && isUuid(f.adminId)) add((p) => `l.admin_id = ${p}::uuid`, f.adminId);
  if (f.action) add((p) => `l.action = ${p}`, f.action);
  if (f.targetType) add((p) => `l.target_type = ${p}`, f.targetType);
  if (f.from && isCalendarDate(f.from)) add((p) => `l.created_at >= (${p}::date)::timestamp at time zone 'Asia/Seoul'`, f.from);
  if (f.to && isCalendarDate(f.to)) add((p) => `l.created_at < (${p}::date + 1)::timestamp at time zone 'Asia/Seoul'`, f.to);
  return { where: conds.length > 0 ? `where ${conds.join(' and ')}` : '', params };
}

function selectAuditLogs(db: Db, f: AuditFilter, limit: number, offset: number): Promise<AuditRow[]> {
  const { where, params } = auditWhere(f);
  return db.query<AuditRow>(
    `select l.id::text as "id", l.admin_id as "adminId", a.name as "adminName",
            l.action, l.target_type as "targetType", l.target_id as "targetId",
            l.before, l.after, l.memo, l.created_at as "createdAt"
       from admin_audit_logs l
       join admins a on a.id = l.admin_id
       ${where}
      order by l.created_at desc, l.id desc
      limit ${limit} offset ${offset}`,
    params,
  );
}

/** 작업 기록 목록: 걸러 보기, 최신순, PAGE_SIZE 개씩 */
export async function listAuditLogs(
  db: Db,
  q: AuditListQuery,
): Promise<{ rows: AuditRow[]; total: number }> {
  const { where, params } = auditWhere(q);
  const [{ total }] = await db.query<{ total: number }>(
    `select count(*)::int as total from admin_audit_logs l ${where}`,
    params,
  );
  const page = safePage(q.page);
  const rows = await selectAuditLogs(db, q, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { rows, total };
}

/** CSV 용: 같은 걸러 보기로 최대 AUDIT_EXPORT_LIMIT 줄, 최신순 */
export function exportAuditLogs(db: Db, f: AuditFilter): Promise<AuditRow[]> {
  return selectAuditLogs(db, f, AUDIT_EXPORT_LIMIT, 0);
}
