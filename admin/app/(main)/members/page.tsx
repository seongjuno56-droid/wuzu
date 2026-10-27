import Link from 'next/link';
import { requireAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { clampPage, PAGE_SIZE, parseListQuery, type SearchParams } from '@/lib/listQuery';
import {
  listMembers,
  MEMBER_EXPORT_LIMIT,
  MEMBER_STATUS_LABEL,
  MEMBER_STATUSES,
  memberFilterFrom,
  PROVIDER_LABEL,
  PROVIDERS,
  type MemberRow,
} from '@/lib/members';
import { DataTable, Pager, SearchBar, type Column } from '@/components/ui';

export const metadata = { title: '회원 · wuzu 어드민' };

const selectStyle = {
  padding: '8px 10px',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-sm)',
  background: '#fff',
  fontSize: 13,
};

const columns: Column<MemberRow>[] = [
  {
    key: 'name',
    label: '이름',
    render: (m) => (
      <Link href={`/members/${m.id}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
        {m.name}
      </Link>
    ),
  },
  { key: 'loginId', label: '아이디', render: (m) => m.loginId ?? '-' },
  { key: 'email', label: '이메일', render: (m) => m.email ?? '-' },
  { key: 'provider', label: '가입 경로', render: (m) => PROVIDER_LABEL[m.provider] ?? m.provider },
  {
    key: 'status',
    label: '상태',
    render: (m) => (
      <span style={{ color: m.status === 'banned' ? 'var(--danger)' : m.status === 'withdrawing' ? 'var(--text-secondary)' : undefined }}>
        {MEMBER_STATUS_LABEL[m.status] ?? m.status}
      </span>
    ),
  },
  { key: 'balance', label: '레터 잔액', render: (m) => m.balance.toLocaleString('ko-KR') },
  { key: 'invitationCount', label: '초대장', render: (m) => m.invitationCount.toLocaleString('ko-KR') },
  { key: 'createdAt', label: '가입일', render: (m) => formatDateTime(m.createdAt) },
];

export default async function MembersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const query = parseListQuery(await searchParams);
  const filter = memberFilterFrom(query);
  const db = await getDb();

  let { rows, total } = await listMembers(db, { ...filter, page: query.page });
  // 마지막 페이지를 넘는 page 면 마지막 페이지를 보여 준다
  const page = clampPage(query.page, total);
  if (page !== query.page) ({ rows, total } = await listMembers(db, { ...filter, page }));

  const exportParams = new URLSearchParams();
  if (filter.q) exportParams.set('q', filter.q);
  if (filter.status) exportParams.set('status', filter.status);
  if (filter.provider) exportParams.set('provider', filter.provider);
  const exportQs = exportParams.toString();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>
          회원 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>{total.toLocaleString('ko-KR')}명</span>
        </h1>
        <a
          href={`/members/export${exportQs ? `?${exportQs}` : ''}`}
          title={`지금 걸러 본 조건 그대로, 최대 ${MEMBER_EXPORT_LIMIT.toLocaleString('ko-KR')}줄`}
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

      <SearchBar defaultValue={query.q} placeholder="이름·이메일·아이디">
        <select name="status" defaultValue={filter.status ?? ''} aria-label="상태" style={selectStyle}>
          <option value="">상태 전체</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEMBER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="provider" defaultValue={filter.provider ?? ''} aria-label="가입 경로" style={selectStyle}>
          <option value="">가입 경로 전체</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABEL[p]}
            </option>
          ))}
        </select>
      </SearchBar>

      <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} empty="회원이 없습니다." />
      <Pager page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
