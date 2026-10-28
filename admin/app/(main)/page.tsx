import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admins';

/** 첫 화면은 아직 대시보드가 없으므로 회원 목록으로 보낸다 */
export default async function Home() {
  await requireAdmin();
  redirect('/members');
}
