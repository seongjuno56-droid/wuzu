import type { ReactNode } from 'react';

export { default as Pager } from './Pager';
export { default as ConfirmButton } from './ConfirmButton';

export interface Column<T> {
  key: string;
  label: string;
  /** 칸 내용. 없으면 row[key] 를 글자로 보여 준다 */
  render?: (row: T) => ReactNode;
  width?: number | string;
}

const cellStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--divider)',
  textAlign: 'left' as const,
  verticalAlign: 'top' as const,
};

/** 목록 표. 서버 컴포넌트에서 쓴다(render 함수를 받으므로) */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = '내용이 없습니다.',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
}) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {columns.map((c) => (
              <th key={c.key} style={{ ...cellStyle, width: c.width, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 12px' }}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} style={cellStyle}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 검색줄. GET 폼이라 제출하면 주소의 검색어가 바뀌고 page 는 처음으로 돌아간다.
 * children 에 걸러 보기용 select 등을 더 넣을 수 있다(같은 폼으로 함께 제출된다).
 */
export function SearchBar({
  defaultValue = '',
  placeholder = '검색',
  name = 'q',
  children,
}: {
  defaultValue?: string;
  placeholder?: string;
  name?: string;
  children?: ReactNode;
}) {
  return (
    <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{
          flex: '1 1 240px',
          maxWidth: 360,
          padding: '8px 12px',
          border: '1px solid var(--divider)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      {children}
      <button
        type="submit"
        style={{
          padding: '8px 14px',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--brand)',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        검색
      </button>
    </form>
  );
}
