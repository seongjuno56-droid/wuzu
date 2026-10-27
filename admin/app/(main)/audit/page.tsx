import Link from 'next/link';
import { listAdmins, requireAdmin } from '@/lib/admins';
import { AUDIT_EXPORT_LIMIT, auditFilterFrom, listAuditLogs, type AuditRow } from '@/lib/audit';
import { getDb } from '@/lib/db';
import { formatDateTime, summarizeChange } from '@/lib/format';
import { AUDIT_ACTION_LABEL, AUDIT_TARGET_TYPE_LABEL } from '@/lib/labels';
import { clampPage, PAGE_SIZE, parseListQuery, type SearchParams } from '@/lib/listQuery';
import { DataTable, Pager, type Column } from '@/components/ui';

export const metadata = { title: '작업 기록 · wuzu 어드민' };

const controlStyle = {
  padding: '8px 10px',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-sm)',
  background: '#fff',
  fontSize: 13,
};

function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const query = parseListQuery(await searchParams);
  const filter = auditFilterFrom(query);
  const db = await getDb();
  const admins = await listAdmins(db);
  const adminName = new Map(admins.map((a) => [a.id, a.name]));

  let { rows, total } = await listAuditLogs(db, { ...filter, page: query.page });
  // 마지막 페이지를 넘는 page 면 마지막 페이지를 보여 준다
  const page = clampPage(query.page, total);
  if (page !== query.page) ({ rows, total } = await listAuditLogs(db, { ...filter, page }));

  const exportParams = new URLSearchParams();
  for (const key of ['admin', 'action', 'target', 'from', 'to']) {
    const v = query.filters[key];
    if (v) exportParams.set(key, v);
  }
  const exportQs = exportParams.toString();

  const columns: Column<AuditRow>[] = [
    { key: 'createdAt', label: '시각', width: 130, render: (l) => formatDateTime(l.createdAt) },
    { key: 'adminName', label: '운영자' },
    { key: 'action', label: '종류', render: (l) => label(AUDIT_ACTION_LABEL, l.action) },
    {
      key: 'target',
      label: '대상',
      render: (l) => {
        const type = label(AUDIT_TARGET_TYPE_LABEL, l.targetType);
        if (l.targetType === 'member') {
          return (
            <Link href={`/members/${l.targetId}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
              {type} {l.targetId}
            </Link>
          );
        }
        if (l.targetType === 'admin') return `${type} ${adminName.get(l.targetId) ?? l.targetId}`;
        return `${type} ${l.targetId}`;
      },
    },
    { key: 'change', label: '바뀐 내용', render: (l) => summarizeChange(l.before, l.after) || '-' },
    { key: 'memo', label: '사유', render: (l) => l.memo ?? '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>
          작업 기록{' '}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>
            {total.toLocaleString('ko-KR')}건
          </span>
        </h1>
        <a
          href={`/audit/export${exportQs ? `?${exportQs}` : ''}`}
          title={`지금 걸러 본 조건 그대로, 최대 ${AUDIT_EXPORT_LIMIT.toLocaleString('ko-KR')}줄`}
          style={{
            padding: '6px 12px',
            border: '1px solid var(--divider)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          CSV
        </a>
      </div>

      <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <select name="admin" defaultValue={filter.adminId ?? ''} aria-label="운영자" style={controlStyle}>
          <option value="">운영자 전체</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
        <select name="action" defaultValue={filter.action ?? ''} aria-label="종류" style={controlStyle}>
          <option value="">종류 전체</option>
          {Object.entries(AUDIT_ACTION_LABEL).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <select name="target" defaultValue={filter.targetType ?? ''} aria-label="대상 종류" style={controlStyle}>
          <option value="">대상 전체</option>
          {Object.entries(AUDIT_TARGET_TYPE_LABEL).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filter.from ?? ''} aria-label="시작일" style={controlStyle} />
        <span style={{ color: 'var(--text-secondary)' }}>~</span>
        <input type="date" name="to" defaultValue={filter.to ?? ''} aria-label="종료일" style={controlStyle} />
        <button
          type="submit"
          style={{
            padding: '8px 14px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          보기
        </button>
      </form>

      <DataTable columns={columns} rows={rows} rowKey={(l) => l.id} empty="작업 기록이 없습니다." />
      <Pager page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
