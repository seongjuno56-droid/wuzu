import type { FieldMessage } from '../components/TextField';
import { isValidEmail, isValidPassword } from './validators';

export function passwordMessage(password: string): FieldMessage {
  if (!password) return null;
  return isValidPassword(password)
    ? { type: 'success', text: '사용 가능한 비밀번호 입니다.' }
    : { type: 'error', text: '비밀번호 형식에 맞지 않습니다.' };
}

export function confirmMessage(password: string, confirm: string): FieldMessage {
  if (!confirm) return null;
  return password === confirm
    ? { type: 'success', text: '비밀번호가 일치합니다.' }
    : { type: 'error', text: '비밀번호가 일치하지 않습니다.' };
}

export function emailFormatMessage(email: string): FieldMessage {
  if (!email) return null;
  return isValidEmail(email) ? null : { type: 'error', text: '이메일 형식이 올바르지 않습니다.' };
}
