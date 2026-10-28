/** My 레터 내역 표시 규칙 — 최근 1년, 충전/사용 구분, 사용 문구 */
import type { LedgerEntry } from '../../services/types';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const withinYear = (e: Pick<LedgerEntry, 'createdAt'>, now: Date) => now.getTime() - Date.parse(e.createdAt) < YEAR_MS;

const newestFirst = (a: LedgerEntry, b: LedgerEntry) => b.createdAt.localeCompare(a.createdAt);

export const chargeEntries = (list: LedgerEntry[], now: Date) =>
  list.filter((e) => e.kind === 'charge' && withinYear(e, now)).sort(newestFirst);

export const spendEntries = (list: LedgerEntry[], now: Date) =>
  list.filter((e) => e.kind !== 'charge' && withinYear(e, now)).sort(newestFirst);

const extendDays = (e: LedgerEntry) => {
  const line = e.lines.find((l) => l.label.startsWith('이용 기간 연장'));
  return line ? Number(line.label.replace(/\D/g, '')) : 0;
};

/** '이름' 초대장 활성화 (+ 기간 연장 N일) / '이름' 기간 연장 N일 / '이름' 컨텐츠 정보 수정 */
export function usageText(e: LedgerEntry): string {
  const name = `'${e.invitationName ?? '초대장'}'`;
  const days = extendDays(e);
  switch (e.kind) {
    case 'activate':
      return `${name} 초대장 활성화${days ? ` + 기간 연장 ${days}일` : ''}`;
    case 'extend':
      return `${name} 기간 연장 ${days}일`;
    case 'edit':
      return `${name} 컨텐츠 정보 수정`;
    default:
      return e.title;
  }
}
