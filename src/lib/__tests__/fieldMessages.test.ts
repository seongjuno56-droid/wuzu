import { confirmMessage, emailFormatMessage, passwordMessage } from '../fieldMessages';

describe('passwordMessage', () => {
  it('is silent while empty', () => expect(passwordMessage('')).toBeNull());
  it('errors on invalid format', () =>
    expect(passwordMessage('abc')).toEqual({ type: 'error', text: '비밀번호 형식에 맞지 않습니다.' }));
  it('confirms a valid password', () =>
    expect(passwordMessage('wuzu1234!')).toEqual({ type: 'success', text: '사용 가능한 비밀번호 입니다.' }));
});

describe('confirmMessage', () => {
  it('is silent while confirm is empty', () => expect(confirmMessage('wuzu1234!', '')).toBeNull());
  it('errors on mismatch', () =>
    expect(confirmMessage('wuzu1234!', 'wuzu1234')).toEqual({ type: 'error', text: '비밀번호가 일치하지 않습니다.' }));
  it('confirms a match', () =>
    expect(confirmMessage('wuzu1234!', 'wuzu1234!')).toEqual({ type: 'success', text: '비밀번호가 일치합니다.' }));
});

describe('emailFormatMessage', () => {
  it('is silent while empty', () => expect(emailFormatMessage('')).toBeNull());
  it('errors on bad format', () =>
    expect(emailFormatMessage('abc@')).toEqual({ type: 'error', text: '이메일 형식이 올바르지 않습니다.' }));
  it('is silent for a valid format (availability is checked separately)', () =>
    expect(emailFormatMessage('a@b.kr')).toBeNull());
});
