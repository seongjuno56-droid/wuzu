import { createInvitation, Invitation } from '../../features/invitation/model';
import { DAY_MS } from '../../features/wallet/pricing';
import { createMockInvitationService } from '../mock/mockInvitationService';
import { createMockNotificationService } from '../mock/mockNotificationService';
import { createMockWalletService } from '../mock/mockWalletService';
import { KeyValueStorage } from '../types';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

const NOW = new Date(2026, 9, 20, 12, 0, 0);
let now = NOW;
let storage: KeyValueStorage;
let invitations: ReturnType<typeof createMockInvitationService>;
let wallet: ReturnType<typeof createMockWalletService>;

const final = (id: string, patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id, ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }),
  name: `초대장 ${id}`,
  status: 'final',
  ...patch,
});

beforeEach(() => {
  now = NOW;
  storage = memoryStorage();
  invitations = createMockInvitationService({ delayMs: 0, storage, now: () => now });
  wallet = createMockWalletService({ delayMs: 0, storage, now: () => now });
});

describe('지갑', () => {
  it('새 계정은 200레터', async () => {
    expect(await wallet.balance('u1')).toBe(200);
  });

  it('활성화 + 연장: 차감, 기간 반영, 기록', async () => {
    await invitations.save(final('a'));
    const r = await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.balance).toBe(120);
    expect(r.invitation.expiresAt).toBe(new Date(NOW.getTime() + 45 * DAY_MS).toISOString());
    expect((await invitations.get('a'))?.expiresAt).toBe(r.invitation.expiresAt);
    const [entry] = await wallet.history('u1', { invitationId: 'a' });
    expect(entry).toMatchObject({ kind: 'activate', title: '초대장 활성화', total: -80, invitationName: '초대장 a' });
    expect(entry.number).toMatch(/^\d{11}$/);
    // 사용내역 카드에 보일 초대장No 도 기록에 남긴다
    expect(entry.invitationNumber).toBe((await invitations.get('a'))!.number);
  });

  it('레터가 딱 맞으면 구매되고, 1 모자라면 아무것도 바뀌지 않는다', async () => {
    await invitations.save(final('a'));
    await invitations.save(final('b'));
    // 200레터 = 활성화 50 + 180일 150 → 딱 맞게 0
    const exact = await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 180 });
    expect(exact.ok && exact.balance).toBe(0);
    const fail = await wallet.spend('u1', { kind: 'activate', invitationId: 'b', extendDays: 0 });
    expect(fail).toEqual({ ok: false, reason: 'insufficient' });
    expect(await wallet.balance('u1')).toBe(0);
    expect((await invitations.get('b'))?.expiresAt).toBeUndefined();
    expect(await wallet.history('u1', { invitationId: 'b' })).toEqual([]);
    await wallet.charge('u1', 'letters_50');
    expect(await wallet.balance('u1')).toBe(50);
    const ok = await wallet.spend('u1', { kind: 'activate', invitationId: 'b', extendDays: 0 });
    expect(ok.ok && ok.balance).toBe(0);
  });

  it('화면을 열어 둔 사이 만료되면 연장은 invalid, 레터 그대로', async () => {
    await invitations.save(final('a'));
    await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 0 });
    now = new Date(NOW.getTime() + 15 * DAY_MS);
    const r = await wallet.spend('u1', { kind: 'extend', invitationId: 'a', extendDays: 30 });
    expect(r).toEqual({ ok: false, reason: 'invalid' });
    expect(await wallet.balance('u1')).toBe(150);
  });

  it('제재·남의 초대장·없는 초대장은 거부', async () => {
    await invitations.save(final('x', { banned: true }));
    await invitations.save(final('y', { ownerId: 'u2' }));
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'x', extendDays: 0 })).toEqual({ ok: false, reason: 'blocked' });
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'y', extendDays: 0 })).toEqual({ ok: false, reason: 'not_found' });
    expect(await wallet.spend('u1', { kind: 'activate', invitationId: 'z', extendDays: 0 })).toEqual({ ok: false, reason: 'not_found' });
  });

  it('활성화된 초대장 수정: 5레터 차감하고 새 내용 저장', async () => {
    await invitations.save(final('a'));
    await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 0 });
    const saved = (await invitations.get('a'))!;
    const r = await wallet.spend('u1', { kind: 'edit', invitation: { ...saved, name: '고친 이름' } });
    expect(r.ok && r.balance).toBe(145);
    expect((await invitations.get('a'))?.name).toBe('고친 이름');
  });

  it('구매·충전하면 구매 알림이 생긴다', async () => {
    const notes = createMockNotificationService({ delayMs: 0, storage, now: () => now });
    await invitations.save(final('a'));
    await wallet.spend('u1', { kind: 'activate', invitationId: 'a', extendDays: 0 });
    await wallet.charge('u1', 'letters_10');
    const mine = (await notes.list('u1', NOW)).filter((x) => x.category === 'purchase');
    expect(mine.map((x) => x.title)).toEqual(['[구매] 레터 충전', `[구매] 초대장No. ${(await invitations.get('a'))!.number}`]);
    expect(await notes.unreadCount('u1', NOW)).toBeGreaterThanOrEqual(2);
    await notes.markAllRead('u1', NOW.toISOString());
    expect(await notes.unreadCount('u1', NOW)).toBe(0);
  });

  it('충전 기록은 사용 기록과 따로 볼 수 있고 결제 금액을 남긴다', async () => {
    await wallet.charge('u1', 'letters_100');
    expect(await wallet.balance('u1')).toBe(300);
    const charges = await wallet.history('u1', { kind: 'charge' });
    expect(charges[0]).toMatchObject({ kind: 'charge', title: '레터 충전', total: 100, invitationId: null, priceWon: 10000 });
    expect(await wallet.history('u1', { kind: 'spend' })).toEqual([]);
  });
});
