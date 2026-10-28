import { emptyRsvpInput } from '../../features/rsvp/rsvp';
import { createMockRsvpService } from '../mock/mockRsvpService';
import type { KeyValueStorage } from '../types';

const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
};
const corp = { ...emptyRsvpInput(), name: '홍길동', org: '우주컴퍼니', phone: '010-1234-5678' };

describe('참석 응답 mock 서비스', () => {
  let now = new Date(2026, 9, 25, 10);
  const make = () => createMockRsvpService({ delayMs: 0, storage: memory(), now: () => now });
  beforeEach(() => (now = new Date(2026, 9, 25, 10)));

  it('하객 제출 → 명단에 생기고, 같은 id 로 다시 내면 그 행을 고친다', async () => {
    const s = make();
    const a = await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '', input: corp });
    expect(a.ok && a.created).toBe(true);
    const id = a.ok ? a.response.id : '';
    const b = await s.submit({
      invitationId: 'i',
      themeId: 'corporate',
      deadline: '',
      input: { ...corp, attending: false },
      id,
    });
    expect(b.ok && b.created).toBe(false);
    const list = await s.list('i');
    expect(list).toHaveLength(1);
    expect(list[0].attending).toBe(false);
    expect(list[0].source).toBe('guest');
  });
  it('검사에 걸리면 invalid, 마감이 지나면 closed (고치기도 막힘)', async () => {
    const s = make();
    expect(await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '', input: emptyRsvpInput() })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    const a = await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '2026-10-30', input: corp });
    now = new Date(2026, 9, 31);
    const id = a.ok ? a.response.id : '';
    expect(
      await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '2026-10-30', input: corp, id }),
    ).toEqual({ ok: false, reason: 'closed' });
  });
  it('만든 사람: 직접 넣기·고치기·지우기, 다른 초대장 명단과 섞이지 않음', async () => {
    const s = make();
    const m = await s.addManual('i', 'corporate', corp);
    expect(m.source).toBe('manual');
    await s.update('i', 'corporate', m.id, { ...corp, name: '홍길순' });
    expect((await s.get('i', m.id))?.name).toBe('홍길순');
    expect((await s.get('i', m.id))?.source).toBe('manual');
    await s.addManual('j', 'corporate', corp);
    await s.remove('i', m.id);
    expect(await s.list('i')).toEqual([]);
    expect(await s.list('j')).toHaveLength(1);
  });
  it('만든 사람이 넣는 값도 검사한다', async () => {
    const s = make();
    await expect(s.addManual('i', 'corporate', emptyRsvpInput())).rejects.toThrow('INVALID');
  });
});
