import { emptyRsvpInput, isRsvpClosed, RsvpResponse, rsvpFields, rsvpTotals, validateRsvp } from '../rsvp';

const row = (v: Partial<RsvpResponse>): RsvpResponse => ({
  ...emptyRsvpInput(),
  id: 'r',
  invitationId: 'i',
  source: 'guest',
  createdAt: '2026-10-25T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
  ...v,
});

describe('참석 응답 규칙', () => {
  it('테마별 받는 항목', () => {
    expect(rsvpFields('corporate')).toEqual(['name', 'org', 'phone', 'attending']);
    expect(rsvpFields('meetup')).toEqual(['name', 'attending', 'companions']);
  });
  it('기업: 이름·소속·연락처 필수, 연락처 형식', () => {
    expect(validateRsvp(emptyRsvpInput(), 'corporate')).toEqual(['name', 'org', 'phone']);
    const ok = { ...emptyRsvpInput(), name: '홍길동', org: '우주컴퍼니', phone: '010-1234-5678' };
    expect(validateRsvp(ok, 'corporate')).toEqual([]);
    expect(validateRsvp({ ...ok, phone: '1234' }, 'corporate')).toEqual(['phone']);
  });
  it('모임: 이름 필수, 동반 인원 0~9 (불참이면 동반 인원은 보지 않음)', () => {
    const ok = { ...emptyRsvpInput(), name: '김나미', companions: 2 };
    expect(validateRsvp(ok, 'meetup')).toEqual([]);
    expect(validateRsvp({ ...ok, companions: 10 }, 'meetup')).toEqual(['companions']);
    expect(validateRsvp({ ...ok, attending: false, companions: 10 }, 'meetup')).toEqual([]);
    expect(validateRsvp({ ...ok, name: ' ' }, 'meetup')).toEqual(['name']);
  });
  it('마감: 마감일 당일까지 받고 다음 날부터 닫힌다, 빈 마감일은 늘 열림', () => {
    expect(isRsvpClosed('', new Date(2030, 0, 1))).toBe(false);
    expect(isRsvpClosed('2026-10-30', new Date(2026, 9, 30, 23, 59))).toBe(false);
    expect(isRsvpClosed('2026-10-30', new Date(2026, 9, 31, 0, 0))).toBe(true);
  });
  it('합계: 참석 행·동반 인원 포함 인원·불참', () => {
    const list = [
      row({ id: 'a', attending: true, companions: 2 }),
      row({ id: 'b', attending: true, companions: 0 }),
      row({ id: 'c', attending: false, companions: 3 }),
    ];
    expect(rsvpTotals(list)).toEqual({ attending: 2, people: 4, declined: 1 });
  });
});
