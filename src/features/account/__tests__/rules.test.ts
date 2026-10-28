import { displayLoginId, isValidNickname, socialLoginId, toAccountValues, validateAccountEdit } from '../rules';
import type { User } from '../../../services/types';

describe('닉네임', () => {
  it('한글·영어·숫자 2~10자', () => {
    expect(isValidNickname('홍길동')).toBe(true);
    expect(isValidNickname('ab12')).toBe(true);
    expect(isValidNickname('홍')).toBe(false);
    expect(isValidNickname('가'.repeat(11))).toBe(false);
    expect(isValidNickname('홍 길동')).toBe(false);
    expect(isValidNickname('홍길동!')).toBe(false);
  });
});

describe('회원정보 수정 검사', () => {
  const base = { name: '홍길동', birth: '1991-01-01', useBirth: true, gender: 'male' as const, useGender: true };
  it('정상', () => {
    expect(validateAccountEdit(base)).toEqual([]);
  });
  it('사용 체크한 항목은 필수, 해제하면 검사하지 않음', () => {
    expect(validateAccountEdit({ ...base, birth: '' })).toEqual(['birth']);
    expect(validateAccountEdit({ ...base, birth: '', useBirth: false })).toEqual([]);
    expect(validateAccountEdit({ ...base, gender: '' })).toEqual(['gender']);
    expect(validateAccountEdit({ ...base, gender: '', useGender: false })).toEqual([]);
  });
  it('생년월일 형식·미래 날짜 오류, 닉네임 오류', () => {
    expect(validateAccountEdit({ ...base, birth: '1991-13-01' })).toEqual(['birth']);
    expect(validateAccountEdit({ ...base, birth: '2999-01-01' })).toEqual(['birth']);
    expect(validateAccountEdit({ ...base, name: '홍' })).toEqual(['name']);
  });
  it('저장 값: 사용 해제 항목은 비운다', () => {
    expect(toAccountValues({ ...base, useBirth: false })).toEqual({ name: '홍길동', birth: undefined, gender: 'male' });
    expect(toAccountValues({ ...base, name: ' 홍길동 ', useGender: false })).toEqual({ name: '홍길동', birth: '1991-01-01', gender: undefined });
  });
});

describe('아이디', () => {
  it('간편 로그인 아이디는 ka_ + 8자 영소문자·숫자', () => {
    expect(socialLoginId(() => 0)).toBe('ka_aaaaaaaa');
    expect(socialLoginId()).toMatch(/^ka_[a-z0-9]{8}$/);
  });
  it('표시: loginId → 이메일 → -', () => {
    const u = { email: 'a@b.c', provider: 'email' } as User;
    expect(displayLoginId({ ...u, loginId: 'ka_x' })).toBe('ka_x');
    expect(displayLoginId(u)).toBe('a@b.c');
    expect(displayLoginId({ ...u, email: null })).toBe('-');
  });
});
