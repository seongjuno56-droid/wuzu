/** 어드민 목록은 모두 한 페이지에 20개씩 */
export const PAGE_SIZE = 20;

/** 이보다 큰 page 는 잘못 들어온 값으로 보고 1 로 (offset 이 SQL 에서 깨지지 않게) */
export const MAX_PAGE = 100000;

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ListQuery {
  q: string;
  page: number;
  /** q·page 를 뺀 나머지 주소 값. 빈 값은 뺀다 */
  filters: Record<string, string>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** page 를 1 이상 MAX_PAGE 이하의 정수로. 아니면 1 */
export function safePage(value: unknown): number {
  const n = typeof value === 'string' ? (/^\d+$/.test(value) ? Number(value) : Number.NaN) : Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_PAGE) return 1;
  return n;
}

/** 주소의 검색 값을 목록 조건으로 바꾼다 */
export function parseListQuery(sp: SearchParams): ListQuery {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (key === 'q' || key === 'page') continue;
    const v = first(value).trim();
    if (v) filters[key] = v;
  }
  return { q: first(sp.q).trim(), page: safePage(first(sp.page)), filters };
}

/** 마지막 페이지를 넘으면 마지막 페이지로 */
export function clampPage(page: number, total: number): number {
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return Math.min(safePage(page), lastPage);
}

/**
 * 검색어를 글자 그대로 찾는 ilike 패턴으로. `\`·`%`·`_` 앞에 `\` 를 붙이고 앞뒤에 `%`.
 * 쿼리는 `ilike $1 escape '\'` 로 쓴다.
 */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
