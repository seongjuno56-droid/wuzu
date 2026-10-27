import type { CSSProperties } from 'react';

/** 로그인·비밀번호 변경 같은 작은 폼에서 함께 쓰는 모양 */
export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

export const fieldStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--divider)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  color: 'var(--text-primary)',
};

export const primaryButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '11px 12px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--brand)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

export const errorTextStyle: CSSProperties = { margin: 0, color: 'var(--danger)', fontSize: 13 };
