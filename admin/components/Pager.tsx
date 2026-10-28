'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/** 페이지 버튼. 지금 주소의 다른 검색 조건은 그대로 두고 page 만 바꾼다 */
export default function Pager({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // 지금 페이지 앞뒤로 2개씩
  const start = Math.max(1, page - 2);
  const end = Math.min(lastPage, page + 2);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const box = (active: boolean, disabled = false) => ({
    minWidth: 32,
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--divider)',
    textAlign: 'center' as const,
    textDecoration: 'none',
    fontSize: 13,
    color: active ? '#fff' : disabled ? 'var(--divider)' : 'var(--text-secondary)',
    background: active ? 'var(--brand)' : 'transparent',
    pointerEvents: disabled ? ('none' as const) : undefined,
  });

  return (
    <nav aria-label="페이지" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
      <Link href={hrefFor(page - 1)} style={box(false, page <= 1)} aria-disabled={page <= 1}>
        이전
      </Link>
      {pages.map((p) => (
        <Link key={p} href={hrefFor(p)} style={box(p === page)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </Link>
      ))}
      <Link href={hrefFor(page + 1)} style={box(false, page >= lastPage)} aria-disabled={page >= lastPage}>
        다음
      </Link>
    </nav>
  );
}
