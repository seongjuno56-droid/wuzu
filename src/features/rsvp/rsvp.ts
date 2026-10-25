/**
 * 참석 응답 — 기업 행사(참석 신청)·모임(참석 여부)이 같이 쓴다 (설계 6장)
 * 받는 항목은 테마가 정하고 만든 사람이 끌 수 없다.
 */
import { isPhone } from '../invitation/corporate';
import { isDateString, toDateString } from '../invitation/model';

export type RsvpField = 'name' | 'org' | 'phone' | 'attending' | 'companions';

export interface RsvpInput {
  name: string;
  attending: boolean;
  /** 소속 (기업) */
  org: string;
  /** 연락처 (기업) */
  phone: string;
  /** 동반 인원 (모임) */
  companions: number;
}

export interface RsvpResponse extends RsvpInput {
  id: string;
  invitationId: string;
  /** 하객이 직접 / 만든 사람이 명단에 직접 넣음 */
  source: 'guest' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export const RSVP_LIMITS = { name: 10, org: 20, companionsMax: 9 } as const;

export const rsvpFields = (themeId: string): RsvpField[] =>
  themeId === 'corporate' ? ['name', 'org', 'phone', 'attending'] : ['name', 'attending', 'companions'];

export const emptyRsvpInput = (): RsvpInput => ({ name: '', attending: true, org: '', phone: '', companions: 0 });

/** 칸 아래 안내 문구 */
export const RSVP_MESSAGE: Record<RsvpField, string> = {
  name: '이름을 입력해 주세요.',
  org: '소속을 입력해 주세요.',
  phone: '연락처를 확인해 주세요.',
  attending: '',
  companions: '동반 인원은 0~9명이에요.',
};

const filled = (s: string) => s.trim().length > 0;

/** 문제 있는 항목 */
export function validateRsvp(input: RsvpInput, themeId: string): RsvpField[] {
  const fields = rsvpFields(themeId);
  const bad: RsvpField[] = [];
  if (!filled(input.name) || input.name.trim().length > RSVP_LIMITS.name) bad.push('name');
  if (fields.includes('org') && (!filled(input.org) || input.org.trim().length > RSVP_LIMITS.org)) bad.push('org');
  if (fields.includes('phone') && !isPhone(input.phone)) bad.push('phone');
  if (
    fields.includes('companions') &&
    input.attending &&
    !(Number.isInteger(input.companions) && input.companions >= 0 && input.companions <= RSVP_LIMITS.companionsMax)
  )
    bad.push('companions');
  return bad;
}

/** 마감일 당일까지 받는다. 빈 마감일은 늘 열림 */
export const isRsvpClosed = (deadline: string, now: Date) => isDateString(deadline) && toDateString(now) > deadline;

/** 합계: 참석 행 수, 참석 인원(동반 포함), 불참 */
export function rsvpTotals(list: RsvpResponse[]) {
  const yes = list.filter((r) => r.attending);
  return {
    attending: yes.length,
    people: yes.reduce((n, r) => n + 1 + (r.companions || 0), 0),
    declined: list.length - yes.length,
  };
}
