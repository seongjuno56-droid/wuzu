import { formatDateTime } from '../../../lib/format';
import {
  filterInvitations,
  hasNewGuestbook,
  isNewEntry,
  periodLabel,
  screenStatus,
  yearOptions,
} from '../status';
import { Invitation } from '../model';
import { createInvitation } from '../themes';

const NOW = new Date(2026, 9, 20, 12, 0, 0);
const iso = (d: Date) => d.toISOString();
const inv = (patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1', today: new Date(2026, 0, 1) }),
  ...patch,
});

describe('screenStatus', () => {
  it('제재가 가장 먼저', () => {
    expect(screenStatus(inv({ banned: true, status: 'draft' }), NOW)).toBe('blocked');
  });
  it('임시저장 → 작성중, 최종저장·활성화 이력 없음 → 비활성화', () => {
    expect(screenStatus(inv({ status: 'draft' }), NOW)).toBe('writing');
    expect(screenStatus(inv({ status: 'final' }), NOW)).toBe('inactive');
  });
  it('종료 전 → 활성화, 종료 시각 정각부터 → 기한만료', () => {
    const later = new Date(NOW.getTime() + 1000);
    expect(screenStatus(inv({ status: 'final', activatedAt: iso(NOW), expiresAt: iso(later) }), NOW)).toBe('active');
    expect(screenStatus(inv({ status: 'final', activatedAt: iso(NOW), expiresAt: iso(NOW) }), NOW)).toBe('expired');
  });
});

describe('표시 도우미', () => {
  it('기간 문구', () => {
    const a = new Date(2024, 11, 30);
    const b = new Date(2025, 1, 28);
    expect(periodLabel(inv({ activatedAt: iso(a), expiresAt: iso(b) }))).toBe('2024.12.30 ~ 2025.02.28 까지 활성화');
    expect(periodLabel(inv())).toBeNull();
  });
  it('일시 형식', () => {
    const d = new Date(2024, 0, 6, 1, 34, 44);
    expect(formatDateTime(d.toISOString())).toBe('2024.01.06 01:34:44');
    expect(formatDateTime(d.toISOString(), '-')).toBe('2024-01-06 01:34:44');
  });
});

describe('필터', () => {
  const a = inv({ id: 'a', status: 'draft', createdAt: iso(new Date(2023, 4, 1)) });
  const b = inv({ id: 'b', status: 'final', createdAt: iso(new Date(2025, 4, 1)) });
  const c = inv({ id: 'c', status: 'draft', createdAt: iso(new Date(2025, 6, 1)) });

  it('연도 선택지는 만든 연도만, 중복 없이 최신순', () => {
    expect(yearOptions([a, b, c])).toEqual([2025, 2023]);
  });
  it('연도·상태를 함께 적용하고 제작일 최신순', () => {
    expect(filterInvitations([a, b, c], { year: 'all', status: 'all' }, NOW).map((i) => i.id)).toEqual(['c', 'b', 'a']);
    expect(filterInvitations([a, b, c], { year: 2025, status: 'writing' }, NOW).map((i) => i.id)).toEqual(['c']);
    expect(filterInvitations([a, b, c], { year: 2023, status: 'inactive' }, NOW)).toEqual([]);
  });
});

describe('방명록 신규', () => {
  it('확인한 적 없으면 모두 신규, 확인 시각 이후 글만 신규', () => {
    const e = { createdAt: '2026-10-20T03:00:00.000Z' };
    expect(isNewEntry(e)).toBe(true);
    expect(isNewEntry(e, '2026-10-20T02:00:00.000Z')).toBe(true);
    expect(isNewEntry(e, '2026-10-20T03:00:00.000Z')).toBe(false);
    expect(hasNewGuestbook([e], '2026-10-21T00:00:00.000Z')).toBe(false);
    expect(hasNewGuestbook([], undefined)).toBe(false);
  });
});
