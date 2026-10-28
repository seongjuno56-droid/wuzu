const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 8~20자, 소문자·숫자·특수문자(~!@#$^&*)만 허용하고 각각 1자 이상 포함
const PASSWORD_RE = /^(?=.*[a-z])(?=.*\d)(?=.*[~!@#$^&*])[a-z\d~!@#$^&*]{8,20}$/;
const NAME_RE = /^[가-힣a-zA-Z0-9]{1,20}$/;
const PHONE_RE = /^\d{10,11}$/;

export const PASSWORD_HINT = '8~20자 영문 소문자, 숫자, 특수문자(~!@#$^&*) 조합';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_RE.test(password);
}

export function isValidName(name: string): boolean {
  return NAME_RE.test(name);
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const hidden = Math.min(2, local.length - 1);
  return `${local.slice(0, local.length - hidden)}${'*'.repeat(hidden)}@${domain}`;
}
