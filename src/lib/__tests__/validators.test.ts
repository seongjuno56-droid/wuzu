import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
  maskEmail,
  normalizeEmail,
} from '../validators';

describe('isValidEmail', () => {
  it('accepts a normal address', () => expect(isValidEmail('a@b.kr')).toBe(true));
  it('rejects an address without a TLD', () => expect(isValidEmail('a@b')).toBe(false));
  it('rejects spaces inside', () => expect(isValidEmail('a b@c.kr')).toBe(false));
});

describe('isValidPassword', () => {
  it('accepts lowercase + digit + special within 8-20', () =>
    expect(isValidPassword('wuzu1234!')).toBe(true));
  it('rejects missing special char', () => expect(isValidPassword('wuzu1234')).toBe(false));
  it('rejects uppercase letters', () => expect(isValidPassword('Wuzu1234!')).toBe(false));
  it('rejects spaces', () => expect(isValidPassword('wu zu1234!')).toBe(false));
  it('rejects hangul', () => expect(isValidPassword('우주wuzu1234!')).toBe(false));
  it('rejects too short', () => expect(isValidPassword('w1!')).toBe(false));
  it('rejects longer than 20', () => expect(isValidPassword('wuzu1234!wuzu1234!abc')).toBe(false));
});

describe('isValidName / isValidPhone', () => {
  it('accepts hangul, latin and digits', () => expect(isValidName('홍길동a1')).toBe(true));
  it('rejects spaces in name', () => expect(isValidName('홍 길동')).toBe(false));
  it('rejects empty name', () => expect(isValidName('')).toBe(false));
  it('accepts 11 digit phone', () => expect(isValidPhone('01012345678')).toBe(true));
  it('rejects dashed / short phone', () => expect(isValidPhone('010-1234')).toBe(false));
});

describe('normalizeEmail / maskEmail', () => {
  it('trims and lowercases', () => expect(normalizeEmail(' Test@Wuzu.KR ')).toBe('test@wuzu.kr'));
  it('masks the last two chars of the local part', () =>
    expect(maskEmail('abcd1234@naver.com')).toBe('abcd12**@naver.com'));
  it('masks short local parts down to one visible char', () =>
    expect(maskEmail('ab@naver.com')).toBe('a*@naver.com'));
});
