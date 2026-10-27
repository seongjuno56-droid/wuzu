import { describe, expect, it } from 'vitest';
import { clampPage, likePattern, parseListQuery, PAGE_SIZE } from '../listQuery';
import { addMember, newTestDb } from '../../test/db';

describe('parseListQuery', () => {
  it('page=abc·-3·빈값 → 1', () => {
    for (const page of ['abc', '-3', '', undefined, '0', '1.5', '1e20', '100001', ['abc']]) {
      expect(parseListQuery({ page }).page).toBe(1);
    }
    expect(parseListQuery({ page: '7' }).page).toBe(7);
    expect(parseListQuery({ page: ['4', '9'] }).page).toBe(4);
  });

  it('q 는 앞뒤 공백을 빼고, 나머지 값은 filters 로', () => {
    expect(parseListQuery({ q: '  홍길동 ', page: '2', status: 'banned', provider: '', x: ['a', 'b'] })).toEqual({
      q: '홍길동',
      page: 2,
      filters: { status: 'banned', x: 'a' },
    });
    expect(parseListQuery({})).toEqual({ q: '', page: 1, filters: {} });
  });
});

describe('clampPage', () => {
  it('clampPage(9, 41) → 3', () => {
    expect(PAGE_SIZE).toBe(20);
    expect(clampPage(9, 41)).toBe(3);
    expect(clampPage(2, 41)).toBe(2);
    expect(clampPage(5, 0)).toBe(1);
    expect(clampPage(0, 100)).toBe(1);
  });
});

describe('likePattern', () => {
  it('likePattern("50%_a\\\\") 는 글자 그대로 찾는다', async () => {
    expect(likePattern('50%_a\\')).toBe('%50\\%\\_a\\\\%');
    const db = await newTestDb();
    await addMember(db, { name: '50%_a\\' });
    await addMember(db, { name: '500a' });
    const rows = await db.query<{ name: string }>(
      `select name from profiles where name ilike $1 escape '\\'`,
      [likePattern('50%_a\\')],
    );
    expect(rows.map((r) => r.name)).toEqual(['50%_a\\']);
  });
});
