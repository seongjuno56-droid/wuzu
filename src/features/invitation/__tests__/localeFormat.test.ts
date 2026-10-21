import { useLocale } from '../../../i18n';
import { formatCountdown, formatDateTimeLine, formatYear, formatYearMonth, weekdayNames } from '../model';

describe('언어별 날짜 서식', () => {
  it('한국어', () => {
    useLocale.setState({ locale: 'ko' });
    expect(weekdayNames()).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(formatYear(2026)).toBe('2026년');
    expect(formatYearMonth(2026, 5)).toBe('2026년 5월');
    expect(formatCountdown({ days: 3, hours: 4, minutes: 5, seconds: 6 })).toBe('3일 4시간 5분 6초');
    expect(formatDateTimeLine(new Date(2026, 11, 31), '14:00')).toBe('2026년 12월 31일 목요일, 오후 2시');
  });
  it('영어', () => {
    useLocale.setState({ locale: 'en' });
    expect(weekdayNames()).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(formatYear(2026)).toBe('2026');
    expect(formatYearMonth(2026, 5)).toBe('May 2026');
    expect(formatCountdown({ days: 3, hours: 4, minutes: 5, seconds: 6 })).toBe('3d 4h 5m 6s');
    expect(formatDateTimeLine(new Date(2026, 11, 31), '14:30')).toBe('Thursday, December 31, 2026, 2:30 PM');
  });
});
