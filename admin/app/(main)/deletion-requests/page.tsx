import Link from 'next/link';
import { requireAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { DELETION_PROVIDER_LABEL, listDeletionRequests, type DeletionRequestRow } from '@/lib/deletionRequests';
import { formatDateTime } from '@/lib/format';
import { clampPage, PAGE_SIZE, parseListQuery, type SearchParams } from '@/lib/listQuery';
import { DataTable, Pager, type Column } from '@/components/ui';
import ReasonConfirmForm from '@/components/ReasonConfirmForm';
import { markDeletionRequestHandledAction } from './actions';

export const metadata = { title: '탈퇴 요청 · wuzu 어드민' };

const muted = { color: 'var(--text-secondary)' };

function Tab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
        color: active ? '#fff' : 'var(--text-secondary)',
        background: active ? 'var(--brand)' : 'transparent',
        border: active ? '1px solid var(--brand)' : '1px solid var(--divider)',
      }}
    >
      {children}
    </Link>
  );
}

const baseColumns: Column<DeletionRequestRow>[] = [
  { key: 'createdAt', label: '요청 시각', width: 130, render: (r) => formatDateTime(r.createdAt) },
  {
    key: 'contactEmail',
    label: '연락 이메일',
    render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.contactEmail}</div>
        <Link href={`/members?q=${encodeURIComponent(r.contactEmail)}`} style={{ fontSize: 12, color: 'var(--brand)' }}>
          회원 검색
        </Link>
      </div>
    ),
  },
  { key: 'provider', label: '로그인 방식', render: (r) => DELETION_PROVIDER_LABEL[r.provider] ?? r.provider },
  { key: 'accountName', label: '앱 닉네임', render: (r) => r.accountName ?? '-' },
  {
    key: 'message',
    label: '하고 싶은 말',
    render: (r) => (r.message ? <div style={{ whiteSpace: 'pre-wrap', maxWidth: 320 }}>{r.message}</div> : '-'),
  },
];

const openColumns: Column<DeletionRequestRow>[] = [
  ...baseColumns,
  {
    key: 'handle',
    label: '처리',
    render: (r) => (
      <ReasonConfirmForm
        message={`${r.contactEmail} 요청을 처리 완료로 표시할까요?`}
        action={markDeletionRequestHandledAction.bind(null, r.id)}
        placeholder="처리 메모 (예: 회원 탈퇴 처리 후 메일 회신)"
      >
        처리 완료
      </ReasonConfirmForm>
    ),
  },
];

const doneColumns: Column<DeletionRequestRow>[] = [
  ...baseColumns,
  {
    key: 'handled',
    label: '처리',
    render: (r) => (
      <div>
        <div>{formatDateTime(r.handledAt)}</div>
        <div style={{ ...muted, fontSize: 12 }}>{r.handledByName ?? '-'}</div>
        {r.memo && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: 260 }}>{r.memo}</div>}
      </div>
    ),
  },
];

export default async function DeletionRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const query = parseListQuery(await searchParams);
  const handled = query.filters.tab === 'done';
  const db = await getDb();

  let { rows, total } = await listDeletionRequests(db, { handled, page: query.page });
  // 마지막 페이지를 넘는 page 면 마지막 페이지를 보여 준다
  const page = clampPage(query.page, total);
  if (page !== query.page) ({ rows, total } = await listDeletionRequests(db, { handled, page }));

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>
        탈퇴 요청 <span style={{ fontSize: 14, fontWeight: 400, ...muted }}>{total.toLocaleString('ko-KR')}건</span>
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, ...muted }}>
        공개 화면{' '}
        <a href="/delete-account" target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>
          /delete-account
        </a>{' '}
        에서 로그인 없이 받은 요청입니다. 7일 안에 처리하고 연락 이메일로 직접 회신해 주세요.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Tab href="/deletion-requests" active={!handled}>
          미처리
        </Tab>
        <Tab href="/deletion-requests?tab=done" active={handled}>
          처리 완료
        </Tab>
      </div>

      <DataTable
        columns={handled ? doneColumns : openColumns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={handled ? '처리한 요청이 없습니다.' : '처리할 요청이 없습니다.'}
      />
      <Pager page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
