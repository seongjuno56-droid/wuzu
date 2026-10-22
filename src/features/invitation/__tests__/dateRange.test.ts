import { isDateBlocked } from '../model';

describe('달력에서 고를 수 있는 날짜', () => {
  const today = '2026-10-22';
  it('행사일(기본): 오늘부터', () => {
    expect(isDateBlocked('2026-10-21', today)).toBe(true);
    expect(isDateBlocked('2026-10-22', today)).toBe(false);
  });
  it('태어난 날: 오늘까지', () => {
    expect(isDateBlocked('2025-04-26', today, 'past')).toBe(false);
    expect(isDateBlocked('2026-10-23', today, 'past')).toBe(true);
  });
  it('성장 이야기: 아무 날', () => {
    expect(isDateBlocked('2020-01-01', today, 'any')).toBe(false);
    expect(isDateBlocked('2030-01-01', today, 'any')).toBe(false);
  });
});
