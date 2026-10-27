import 'server-only';
import type { Db } from './db';
import { PAGE_SIZE } from './listQuery';

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

export interface AuditListQuery {
  adminId?: string;
  action?: string;
  targetType?: string;
  /** 'YYYY-MM-DD', 그날 0시부터 */
  from?: string;
  /** 'YYYY-MM-DD', 그날 끝까지 포함 */
  to?: string;
  page: number;
}

/** jsonb 매개변수로 보낼 값. undefined 는 null 로 */
function toJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
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

/** 작업 기록 목록: 걸러 보기, 최신순, PAGE_SIZE 개씩 */
export async function listAuditLogs(
  db: Db,
  q: AuditListQuery,
): Promise<{ rows: AuditRow[]; total: number }> {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (p: string) => string, value: unknown) => {
    params.push(value);
    conds.push(sql(`$${params.length}`));
  };
  if (q.adminId) add((p) => `l.admin_id = ${p}::uuid`, q.adminId);
  if (q.action) add((p) => `l.action = ${p}`, q.action);
  if (q.targetType) add((p) => `l.target_type = ${p}`, q.targetType);
  if (q.from) add((p) => `l.created_at >= ${p}::date`, q.from);
  if (q.to) add((p) => `l.created_at < ${p}::date + 1`, q.to);
  const where = conds.length > 0 ? `where ${conds.join(' and ')}` : '';

  const [{ total }] = await db.query<{ total: number }>(
    `select count(*)::int as total from admin_audit_logs l ${where}`,
    params,
  );

  const page = Math.max(1, Math.floor(q.page) || 1);
  const rows = await db.query<AuditRow>(
    `select l.id::text as "id", l.admin_id as "adminId", a.name as "adminName",
            l.action, l.target_type as "targetType", l.target_id as "targetId",
            l.before, l.after, l.memo, l.created_at as "createdAt"
       from admin_audit_logs l
       join admins a on a.id = l.admin_id
       ${where}
      order by l.created_at desc, l.id desc
      limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  return { rows, total };
}
