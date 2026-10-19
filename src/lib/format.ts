const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string, sep = '.'): string {
  const d = new Date(iso);
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(sep);
}

/** 2024.01.01 11:50:33 (sep '-' 이면 2024-01-01 11:50:33) */
export function formatDateTime(iso: string, sep = '.'): string {
  const d = new Date(iso);
  return `${formatDate(iso, sep)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 숫자만 입력받아 YYYY-MM-DD 형태로 하이픈을 채운다 */
export function formatBirthInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function isValidBirth(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getMonth() === mo - 1 && date.getDate() === d && date <= new Date() && y >= 1900;
}

/** 남은 시간(ms)을 mm:ss 로 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
