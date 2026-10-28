import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admins';
import AdminNav from '@/components/AdminNav';

/**
 * 사이드바 틀. App Router 는 클라이언트 이동 때 layout 을 다시 실행하지 않으므로
 * 여기의 requireAdmin 만 믿으면 안 된다: 각 page·route·서버 액션 첫 줄에서도 반드시 requireAdmin 을 부른다.
 */
export default async function MainLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div style={{ display: 'flex' }}>
      <AdminNav adminName={admin.name} />
      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>{children}</main>
    </div>
  );
}
