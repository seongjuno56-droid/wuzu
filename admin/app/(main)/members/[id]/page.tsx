import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/format';
import { INVITATION_STATUS_LABEL, LEDGER_KIND_LABEL } from '@/lib/labels';
import {
  getMember,
  MEMBER_DETAIL_INVITATIONS,
  MEMBER_STATUS_LABEL,
  PROVIDER_LABEL,
  type MemberInvitation,
  type MemberLedgerEntry,
} from '@/lib/members';
import { DataTable, type Column } from '@/components/ui';
import ReasonConfirmForm from '@/components/ReasonConfirmForm';
import { setMemberBannedAction } from '../actions';

export const metadata = { title: '회원 상세 · wuzu 어드민' };

const GENDER_LABEL: Record<string, string> = { male: '남', female: '여', none: '선택 안 함' };

const invitationColumns: Column<MemberInvitation>[] = [
  { key: 'number', label: '초대장No' },
  { key: 'name', label: '이름' },
  {
    key: 'status',
    label: '상태',
    render: (i) => (
      <>
        {INVITATION_STATUS_LABEL[i.status] ?? i.status}
        {i.banned && <span style={{ marginLeft: 6, color: 'var(--danger)' }}>숨김</span>}
      </>
    ),
  },
  { key: 'expiresAt', label: '만료일', render: (i) => formatDate(i.expiresAt) || '-' },
  { key: 'createdAt', label: '만든 날', render: (i) => formatDateTime(i.createdAt) },
];

const ledgerColumns: Column<MemberLedgerEntry>[] = [
  { key: 'createdAt', label: '일시', render: (l) => formatDateTime(l.createdAt) },
  { key: 'kind', label: '종류', render: (l) => LEDGER_KIND_LABEL[l.kind] ?? l.kind },
  { key: 'title', label: '내용' },
  {
    key: 'total',
    label: '레터',
    render: (l) => (
      <span style={{ color: l.total < 0 ? 'var(--danger)' : undefined }}>
        {l.total > 0 ? '+' : ''}
        {l.total.toLocaleString('ko-KR')}
      </span>
    ),
  },
  { key: 'number', label: '원장No' },
];

function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const member = await getMember(await getDb(), id);
  if (!member) notFound();

  const info: [string, ReactNode][] = [
    ['회원 id', <code key="id" style={{ fontSize: 12 }}>{member.id}</code>],
    ['아이디', member.loginId ?? '-'],
    ['이메일', member.email ?? '-'],
    ['가입 경로', PROVIDER_LABEL[member.provider] ?? member.provider],
    ['상태', MEMBER_STATUS_LABEL[member.status] ?? member.status],
    ['생년월일', member.birth ?? '-'],
    ['성별', member.gender ? (GENDER_LABEL[member.gender] ?? member.gender) : '-'],
    ['전화번호', member.phone ?? '-'],
    ['마케팅 수신', `${member.marketingAgreed ? '동의' : '동의 안 함'}${member.marketingUpdatedAt ? ` (${formatDateTime(member.marketingUpdatedAt)})` : ''}`],
    ['레터 잔액', member.balance.toLocaleString('ko-KR')],
    ['가입일', formatDateTime(member.createdAt)],
    ['정보 수정일', formatDateTime(member.profileUpdatedAt) || '-'],
  ];
  if (member.withdrawRequestedAt) info.push(['탈퇴 요청일', formatDateTime(member.withdrawRequestedAt)]);

  return (
    <div>
      <Link href="/members" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        ← 회원 목록
      </Link>
      <h1 style={{ margin: '8px 0 20px', fontSize: 20 }}>{member.name}</h1>

      <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', margin: 0, fontSize: 13 }}>
        {info.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>

      <Section title="회원 상태">
        {member.status === 'withdrawing' ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            탈퇴 진행 중인 회원은 정지·해제할 수 없습니다.
          </p>
        ) : member.status === 'banned' ? (
          <ReasonConfirmForm
            key="unban"
            message={`${member.name} 회원의 정지를 해제할까요?`}
            action={setMemberBannedAction.bind(null, member.id, false)}
          >
            정지 해제
          </ReasonConfirmForm>
        ) : (
          <ReasonConfirmForm
            key="ban"
            danger
            message={`${member.name} 회원을 정지할까요? 정지된 회원은 앱을 쓸 수 없습니다.`}
            action={setMemberBannedAction.bind(null, member.id, true)}
          >
            정지
          </ReasonConfirmForm>
        )}
      </Section>

      <Section
        title={`초대장 ${member.invitationCount.toLocaleString('ko-KR')}개`}
        extra={
          <Link href={`/invitations?owner=${member.id}`} style={{ fontSize: 13, color: 'var(--brand)' }}>
            초대장 목록에서 보기
          </Link>
        }
      >
        <DataTable columns={invitationColumns} rows={member.invitations} rowKey={(i) => i.id} empty="초대장이 없습니다." />
        {member.invitationCount > MEMBER_DETAIL_INVITATIONS && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            최근 {MEMBER_DETAIL_INVITATIONS}개만 보여 줍니다.
          </p>
        )}
      </Section>

      <Section title="최근 레터 원장" extra={<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>최근 20줄</span>}>
        <DataTable columns={ledgerColumns} rows={member.ledger} rowKey={(l) => l.id} empty="원장 기록이 없습니다." />
      </Section>
    </div>
  );
}
