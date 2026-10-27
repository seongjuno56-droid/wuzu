import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admins';
import { auditFilterFrom, exportAuditLogs } from '@/lib/audit';
import { toCsv } from '@/lib/csv';
import { getDb } from '@/lib/db';
import { compactDate, formatDateTime, summarizeChange } from '@/lib/format';
import { AUDIT_ACTION_LABEL, AUDIT_TARGET_TYPE_LABEL } from '@/lib/labels';
import { parseListQuery, type SearchParams } from '@/lib/listQuery';

/** 작업 기록 CSV: 목록에서 걸러 본 조건 그대로, 최대 5,000줄 */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const sp: SearchParams = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    sp[key] = request.nextUrl.searchParams.getAll(key);
  }
  const rows = await exportAuditLogs(await getDb(), auditFilterFrom(parseListQuery(sp)));
  const actionLabel: Record<string, string> = AUDIT_ACTION_LABEL;
  const targetLabel: Record<string, string> = AUDIT_TARGET_TYPE_LABEL;

  const csv = toCsv(
    ['기록 id', '시각', '운영자', '운영자 id', '종류', '대상 종류', '대상 id', '바뀐 내용', '사유'],
    rows.map((l) => [
      l.id,
      formatDateTime(l.createdAt),
      l.adminName,
      l.adminId,
      actionLabel[l.action] ?? l.action,
      targetLabel[l.targetType] ?? l.targetType,
      l.targetId,
      summarizeChange(l.before, l.after),
      l.memo,
    ]),
  );
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="audit-${compactDate(new Date())}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
