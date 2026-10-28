'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';

/** 왼쪽 메뉴. 다음 단계에서 여기에 더한다(대시보드는 3단계에서 맨 위) */
export const NAV_ITEMS = [
  { href: '/members', label: '회원' },
  { href: '/invitations', label: '초대장' },
  { href: '/admins', label: '운영자' },
  { href: '/audit', label: '작업 기록' },
];

export default function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--divider)',
        minHeight: '100vh',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
        <img src="/brand/mark.png" alt="" width={26} height={26} style={{ borderRadius: 7 }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>wuzu 어드민</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                color: active ? '#fff' : 'var(--text-secondary)',
                background: active ? 'var(--brand)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div style={{ padding: '0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{adminName}</div>
      <form action={logoutAction}>
        <button
          type="submit"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--divider)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          로그아웃
        </button>
      </form>
    </nav>
  );
}
