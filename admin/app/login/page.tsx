import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE } from '@/lib/session';
import AuthCard from '@/components/AuthCard';
import LoginForm from './LoginForm';

export const metadata = { title: '로그인 · wuzu 어드민' };

export default async function LoginPage() {
  // 이미 로그인한 운영자는 첫 화면으로
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await currentAdmin(await getDb(), token)) redirect('/');

  return (
    <AuthCard title="wuzu 어드민">
      <LoginForm />
    </AuthCard>
  );
}
