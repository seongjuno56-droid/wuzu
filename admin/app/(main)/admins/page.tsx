import { listAdmins, MIN_PASSWORD_LENGTH, requireAdmin, type AdminRow } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { ConfirmButton, DataTable, type Column } from '@/components/ui';
import CreateAdminForm from './CreateAdminForm';
import { setAdminActiveAction } from './actions';

export const metadata = { title: '운영자 · wuzu 어드민' };

export default async function AdminsPage() {
  const me = await requireAdmin();
  const admins = await listAdmins(await getDb());
  const activeCount = admins.filter((a) => a.active).length;

  const columns: Column<AdminRow>[] = [
    {
      key: 'name',
      label: '이름',
      render: (a) => (
        <>
          {a.name}
          {a.id === me.id && <span style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>(나)</span>}
        </>
      ),
    },
    { key: 'email', label: '이메일' },
    {
      key: 'active',
      label: '상태',
      render: (a) =>
        a.active ? (
          <>
            활성
            {a.mustChangePassword && (
              <span style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>· 비밀번호 변경 전</span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>비활성</span>
        ),
    },
    { key: 'lastLoginAt', label: '마지막 로그인', render: (a) => formatDateTime(a.lastLoginAt) || '-' },
    { key: 'createdAt', label: '만든 날', render: (a) => formatDateTime(a.createdAt) },
    {
      key: 'action',
      label: '관리',
      width: 280,
      render: (a) =>
        a.active ? (
          <ConfirmButton
            key="deactivate"
            danger
            message={
              a.id === me.id
                ? '내 계정을 비활성화할까요? 바로 로그아웃되고 다시 로그인할 수 없습니다.'
                : `'${a.name}' 운영자를 비활성화할까요? 바로 로그인할 수 없게 됩니다.`
            }
            action={setAdminActiveAction.bind(null, a.id, false)}
          >
            비활성화
          </ConfirmButton>
        ) : (
          <ConfirmButton
            key="reactivate"
            message={`'${a.name}' 운영자를 다시 켤까요? 다시 로그인할 수 있게 됩니다.`}
            action={setAdminActiveAction.bind(null, a.id, true)}
          >
            다시 켜기
          </ConfirmButton>
        ),
    },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: 20 }}>
        운영자{' '}
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>
          활성 {activeCount.toLocaleString('ko-KR')}명 / 전체 {admins.length.toLocaleString('ko-KR')}명
        </span>
      </h1>
      <CreateAdminForm minLength={MIN_PASSWORD_LENGTH} />
      <DataTable columns={columns} rows={admins} rowKey={(a) => a.id} empty="운영자가 없습니다." />
    </div>
  );
}
