import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admins';
import AdminNav from '@/components/AdminNav';

export default async function MainLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div style={{ display: 'flex' }}>
      <AdminNav adminName={admin.name} />
      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>{children}</main>
    </div>
  );
}
