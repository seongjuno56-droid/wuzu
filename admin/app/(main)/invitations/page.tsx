import Link from 'next/link';
import { requireAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  getInvitationOwnerName,
  INVITATION_EXPORT_LIMIT,
  invitationFilterFrom,
  listInvitations,
  type InvitationFilter,
  type InvitationRow,
} from '@/lib/invitations';
import { INVITATION_STATE_LABEL, INVITATION_STATES, THEME_LABEL, THEMES } from '@/lib/labels';
import { clampPage, PAGE_SIZE, parseListQuery, type SearchParams } from '@/lib/listQuery';
import { DataTable, Pager, SearchBar, type Column } from '@/components/ui';
import ReasonConfirmForm from '@/components/ReasonConfirmForm';
import { setInvitationBannedAction } from './actions';

export const metadata = { title: '초대장 · wuzu 어드민' };

const selectStyle = {
  padding: '8px 10px',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-sm)',
  background: '#fff',
  fontSize: 13,
};

const columns: Column<InvitationRow>[] = [
  { key: 'number', label: '초대장No' },
  { key: 'name', label: '이름' },
  { key: 'theme', label: '테마', render: (i) => THEME_LABEL[i.themeId] ?? i.themeId },
  {
    key: 'owner',
    label: '만든 사람',
    render: (i) => (
      <Link href={`/members/${i.ownerId}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
        {i.ownerName}
      </Link>
    ),
  },
  {
    key: 'state',
    label: '상태',
    render: (i) => (
      <>
        <span style={{ color: i.state === 'expired' ? 'var(--text-secondary)' : undefined }}>
          {INVITATION_STATE_LABEL[i.state] ?? i.state}
        </span>
        {i.banned && <span style={{ marginLeft: 6, color: 'var(--danger)', fontWeight: 600 }}>숨김</span>}
      </>
    ),
  },
  { key: 'expiresAt', label: '만료일', render: (i) => formatDate(i.expiresAt) || '-' },
  { key: 'createdAt', label: '만든 날', render: (i) => formatDateTime(i.createdAt) },
  {
    key: 'action',
    label: '숨김',
    width: 260,
    render: (i) =>
      i.banned ? (
        <ReasonConfirmForm
          key="unhide"
          message={`'${i.name}' 초대장의 숨김을 해제할까요? 다시 공개 주소로 볼 수 있게 됩니다.`}
          action={setInvitationBannedAction.bind(null, i.id, false)}
        >
          숨김 해제
        </ReasonConfirmForm>
      ) : (
        <ReasonConfirmForm
          key="hide"
          danger
          message={`'${i.name}' 초대장을 숨길까요? 공개 주소로 볼 수 없게 됩니다.`}
          action={setInvitationBannedAction.bind(null, i.id, true)}
        >
          숨기기
        </ReasonConfirmForm>
      ),
  },
];

/** 걸러 보기를 주소 검색 값으로. omit 에 든 키는 뺀다 */
function filterQs(f: InvitationFilter, omit: string[] = []): string {
  const params = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ['q', f.q],
    ['theme', f.theme],
    ['state', f.state],
    ['banned', f.banned],
    ['owner', f.owner],
  ];
  for (const [key, value] of entries) {
    if (value && !omit.includes(key)) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function InvitationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const query = parseListQuery(await searchParams);
  const filter = invitationFilterFrom(query, new Date());
  const db = await getDb();

  let { rows, total } = await listInvitations(db, { ...filter, page: query.page });
  // 마지막 페이지를 넘는 page 면 마지막 페이지를 보여 준다
  const page = clampPage(query.page, total);
  if (page !== query.page) ({ rows, total } = await listInvitations(db, { ...filter, page }));

  // uuid 가 아니거나 없는 회원이면 null (목록에서도 owner 걸러 보기는 무시되거나 0개)
  const ownerName = filter.owner ? await getInvitationOwnerName(db, filter.owner) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>
          초대장 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>{total.toLocaleString('ko-KR')}개</span>
        </h1>
        <a
          href={`/invitations/export${filterQs(filter)}`}
          title={`지금 걸러 본 조건 그대로, 최대 ${INVITATION_EXPORT_LIMIT.toLocaleString('ko-KR')}줄`}
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

      {filter.owner && (
        <p style={{ margin: '0 0 12px', fontSize: 13 }}>
          만든 사람:{' '}
          {ownerName ? (
            <Link href={`/members/${filter.owner}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
              {ownerName}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>찾을 수 없는 회원</span>
          )}{' '}
          <Link href={`/invitations${filterQs(filter, ['owner'])}`} style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
            [걸러 보기 해제]
          </Link>
        </p>
      )}

      <SearchBar defaultValue={query.q} placeholder="초대장 이름·초대장No·만든 사람">
        {filter.owner && <input type="hidden" name="owner" value={filter.owner} />}
        <select name="theme" defaultValue={filter.theme ?? ''} aria-label="테마" style={selectStyle}>
          <option value="">테마 전체</option>
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABEL[t]}
            </option>
          ))}
        </select>
        <select name="state" defaultValue={filter.state ?? ''} aria-label="상태" style={selectStyle}>
          <option value="">상태 전체</option>
          {INVITATION_STATES.map((s) => (
            <option key={s} value={s}>
              {INVITATION_STATE_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="banned" defaultValue={filter.banned ?? ''} aria-label="숨김" style={selectStyle}>
          <option value="">숨김 전체</option>
          <option value="true">숨긴 것만</option>
          <option value="false">숨기지 않은 것만</option>
        </select>
      </SearchBar>

      <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} empty="초대장이 없습니다." />
      <Pager page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
