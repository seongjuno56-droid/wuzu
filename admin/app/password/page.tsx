import { MIN_PASSWORD_LENGTH, requireAdmin } from '@/lib/admins';
import AuthCard from '@/components/AuthCard';
import PasswordForm from './PasswordForm';
import { logoutAction } from '../login/actions';

export const metadata = { title: '비밀번호 변경 · wuzu 어드민' };

export default async function PasswordPage() {
  const admin = await requireAdmin({ allowPasswordChange: true });
  return (
    <AuthCard title="비밀번호 변경">
      {admin.mustChangePassword && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          처음 로그인했거나 비밀번호가 초기화되었습니다. 계속하려면 비밀번호를 바꿔 주세요.
        </p>
      )}
      <PasswordForm minLength={MIN_PASSWORD_LENGTH} />
      <form action={logoutAction} style={{ marginTop: 12 }}>
        <button
          type="submit"
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </form>
    </AuthCard>
  );
}
