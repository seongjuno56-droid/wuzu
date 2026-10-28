import type { ReactNode } from 'react';

/** 사이드바 없는 화면(로그인·비밀번호 변경)의 가운데 카드 */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '32px 28px',
          border: '1px solid var(--divider)',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <img src="/brand/mark.png" alt="" width={26} height={26} style={{ borderRadius: 7 }} />
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
