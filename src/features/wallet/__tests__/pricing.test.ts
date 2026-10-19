import { createInvitation, Invitation } from '../../invitation/model';
import { applyOrder, DAY_MS, orderCost, orderLines } from '../pricing';

const NOW = new Date(2026, 9, 20, 12, 0, 0);
const base = (patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }),
  status: 'final',
  ...patch,
});
const at = (ms: number) => new Date(ms).toISOString();

describe('주문 금액', () => {
  it('활성화만 / 활성화 + 연장', () => {
    expect(orderLines({ kind: 'activate', invitationId: 'i', extendDays: 0 })).toEqual([{ label: '서비스 활성화', amount: -50 }]);
    expect(orderCost({ kind: 'activate', invitationId: 'i', extendDays: 30 })).toBe(80);
    expect(orderLines({ kind: 'activate', invitationId: 'i', extendDays: 30 })[1]).toEqual({ label: '이용 기간 연장 +30일', amount: -30 });
  });
  it('연장 할인가, 수정 5레터', () => {
    expect(orderCost({ kind: 'extend', invitationId: 'i', extendDays: 60 })).toBe(55);
    expect(orderCost({ kind: 'extend', invitationId: 'i', extendDays: 180 })).toBe(150);
    expect(orderLines({ kind: 'edit', invitation: base() })).toEqual([{ label: '초대장 컨텐츠 수정', amount: -5 }]);
  });
});

describe('주문 적용(기간 계산)', () => {
  it('첫 활성화: 지금부터 15일 + 연장일', () => {
    const r = applyOrder(base(), { kind: 'activate', invitationId: 'i', extendDays: 30 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(NOW.toISOString());
    expect(r.expiresAt).toBe(at(NOW.getTime() + 45 * DAY_MS));
  });
  it('기한만료 후 재활성화: 지금부터 새로', () => {
    const old = base({ activatedAt: at(NOW.getTime() - 40 * DAY_MS), expiresAt: at(NOW.getTime() - 25 * DAY_MS) });
    const r = applyOrder(old, { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(NOW.toISOString());
    expect(r.expiresAt).toBe(at(NOW.getTime() + 15 * DAY_MS));
  });
  it('활성 중 연장: 종료일 뒤에 더하고 시작일은 그대로', () => {
    const start = at(NOW.getTime() - DAY_MS);
    const end = NOW.getTime() + 3 * DAY_MS;
    const r = applyOrder(base({ activatedAt: start, expiresAt: at(end) }), { kind: 'extend', invitationId: 'i', extendDays: 60 }, NOW) as Invitation;
    expect(r.activatedAt).toBe(start);
    expect(r.expiresAt).toBe(at(end + 60 * DAY_MS));
  });
  it('상태가 맞지 않으면 invalid (만료된 초대장 연장, 활성 중 재활성화, 작성중 활성화)', () => {
    const expired = base({ activatedAt: at(0), expiresAt: NOW.toISOString() });
    expect(applyOrder(expired, { kind: 'extend', invitationId: 'i', extendDays: 30 }, NOW)).toBe('invalid');
    const active = base({ activatedAt: at(0), expiresAt: at(NOW.getTime() + DAY_MS) });
    expect(applyOrder(active, { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('invalid');
    expect(applyOrder(base({ status: 'draft' }), { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('invalid');
  });
  it('사용불가는 blocked', () => {
    expect(applyOrder(base({ banned: true }), { kind: 'activate', invitationId: 'i', extendDays: 0 }, NOW)).toBe('blocked');
  });
  it('수정: 새 내용을 쓰되 번호·기간·제재는 저장본 값 유지', () => {
    const saved = base({ activatedAt: at(0), expiresAt: at(NOW.getTime() + DAY_MS), number: '12345678901' });
    const edited = { ...saved, name: '새 이름', number: 'x', expiresAt: at(NOW.getTime() + 999 * DAY_MS) };
    const r = applyOrder(saved, { kind: 'edit', invitation: edited }, NOW) as Invitation;
    expect(r.name).toBe('새 이름');
    expect(r.number).toBe('12345678901');
    expect(r.expiresAt).toBe(saved.expiresAt);
  });
});
