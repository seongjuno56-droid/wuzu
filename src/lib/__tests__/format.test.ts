import { formatBirthInput, formatDate } from '../format';

describe('formatDate', () => {
  it('formats ISO dates in local time with a separator', () => {
    expect(formatDate(new Date(2025, 0, 31, 12).toISOString(), '.')).toBe('2025.01.31');
    expect(formatDate(new Date(2025, 0, 8, 12).toISOString(), '-')).toBe('2025-01-08');
  });
});

describe('formatBirthInput', () => {
  it('inserts dashes as digits are typed', () => {
    expect(formatBirthInput('1991')).toBe('1991');
    expect(formatBirthInput('19910')).toBe('1991-0');
    expect(formatBirthInput('19910101')).toBe('1991-01-01');
  });
  it('drops non-digits and extra digits', () => {
    expect(formatBirthInput('1991-01-01')).toBe('1991-01-01');
    expect(formatBirthInput('1991a0101999')).toBe('1991-01-01');
  });
});

describe('isValidBirth', () => {
  const { isValidBirth } = require('../format');
  it('accepts real past dates', () => expect(isValidBirth('1991-01-01')).toBe(true));
  it('rejects impossible dates', () => expect(isValidBirth('1991-02-30')).toBe(false));
  it('rejects future dates', () => expect(isValidBirth('2999-01-01')).toBe(false));
  it('rejects partial input', () => expect(isValidBirth('1991-01')).toBe(false));
});

describe('formatRemaining', () => {
  const { formatRemaining } = require('../format');
  it('shows mm:ss', () => expect(formatRemaining(299_000)).toBe('04:59'));
  it('rounds partial seconds up', () => expect(formatRemaining(1_200)).toBe('00:02'));
  it('never goes negative', () => expect(formatRemaining(-5_000)).toBe('00:00'));
});
