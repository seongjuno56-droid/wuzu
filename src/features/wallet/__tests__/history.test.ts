import type { LedgerEntry } from '../../../services/types';
import { chargeEntries, spendEntries, usageText, withinYear } from '../history';
import { LETTER_PRODUCTS } from '../pricing';

const NOW = new Date(2026, 9, 20, 12);
const entry = (patch: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'l', number: '12345678901', userId: 'u', invitationId: 'i', invitationName: '병주 모바일 청첩장',
  kind: 'activate', title: '초대장 활성화', lines: [{ label: '서비스 활성화', amount: -50 }], total: -50,
  createdAt: NOW.toISOString(), ...patch,
});

describe('충전 상품', () => {
  it('10/50/100/300/500 레터, 1레터 100원, 보너스 없음', () => {
    expect(LETTER_PRODUCTS.map((p) => [p.letters, p.price, p.bonus])).toEqual([
      [10, 1000, 0], [50, 5000, 0], [100, 10000, 0], [300, 30000, 0], [500, 50000, 0],
    ]);
  });
});

describe('내역', () => {
  it('최근 1년(365일 미만)만', () => {
    const day = 86400000;
    expect(withinYear(entry({ createdAt: new Date(NOW.getTime() - 364 * day).toISOString() }), NOW)).toBe(true);
    expect(withinYear(entry({ createdAt: new Date(NOW.getTime() - 365 * day).toISOString() }), NOW)).toBe(false);
  });
  it('충전·사용 나누기, 최신순', () => {
    const list = [
      entry({ id: 'a', createdAt: '2026-10-01T00:00:00.000Z' }),
      entry({ id: 'c', kind: 'charge', total: 50, createdAt: '2026-10-02T00:00:00.000Z' }),
      entry({ id: 'b', createdAt: '2026-10-03T00:00:00.000Z' }),
    ];
    expect(spendEntries(list, NOW).map((e) => e.id)).toEqual(['b', 'a']);
    expect(chargeEntries(list, NOW).map((e) => e.id)).toEqual(['c']);
  });
  it('사용 문구', () => {
    expect(usageText(entry({}))).toBe("'병주 모바일 청첩장' 초대장 활성화");
    expect(usageText(entry({ lines: [{ label: '서비스 활성화', amount: -50 }, { label: '이용 기간 연장 +30일', amount: -30 }] }))).toBe(
      "'병주 모바일 청첩장' 초대장 활성화 + 기간 연장 30일",
    );
    expect(usageText(entry({ kind: 'extend', lines: [{ label: '이용 기간 연장 +60일', amount: -55 }] }))).toBe(
      "'병주 모바일 청첩장' 기간 연장 60일",
    );
    expect(usageText(entry({ kind: 'edit' }))).toBe("'병주 모바일 청첩장' 컨텐츠 정보 수정");
  });
});
