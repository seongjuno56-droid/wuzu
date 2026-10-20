/**
 * 계정 규칙 — 닉네임, 회원정보 수정 검사, 아이디
 * (설계: docs/superpowers/specs/2026-10-20-mypage-design.md)
 */
import { isValidBirth } from '../../lib/format';
import type { Gender, User } from '../../services/types';

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,10}$/;

/** 회원정보 수정 닉네임: 한글·영어·숫자 2~10자 */
export const isValidNickname = (s: string) => NICKNAME_RE.test(s.trim());

export interface AccountEditInput {
  name: string;
  birth: string;
  useBirth: boolean;
  gender: Gender | '';
  useGender: boolean;
}

/** 오류 항목 목록 (빈 배열 = 통과). 사용 체크를 끈 항목은 검사하지 않는다 */
export function validateAccountEdit(i: AccountEditInput): ('name' | 'birth' | 'gender')[] {
  const errors: ('name' | 'birth' | 'gender')[] = [];
  if (!isValidNickname(i.name)) errors.push('name');
  if (i.useBirth && !isValidBirth(i.birth)) errors.push('birth');
  if (i.useGender && !i.gender) errors.push('gender');
  return errors;
}

/** 저장할 값: 사용 체크를 끈 항목은 비운다 */
export function toAccountValues(i: AccountEditInput): { name: string; birth?: string; gender?: Gender } {
  return {
    name: i.name.trim(),
    birth: i.useBirth ? i.birth : undefined,
    gender: i.useGender && i.gender ? i.gender : undefined,
  };
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 간편 로그인(카카오) 아이디: ka_ + 영소문자·숫자 8자 (어드민·DB 관리용) */
export function socialLoginId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length) % ID_CHARS.length];
  return `ka_${id}`;
}

/** 화면 표시용 아이디 */
export const displayLoginId = (u: Pick<User, 'loginId' | 'email'>) => u.loginId ?? u.email ?? '-';
