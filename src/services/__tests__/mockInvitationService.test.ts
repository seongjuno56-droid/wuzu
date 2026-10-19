import { createInvitation } from '../../features/invitation/model';
import { createMockInvitationService } from '../mock/mockInvitationService';
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

let svc: ReturnType<typeof createMockInvitationService>;
let clock = 1_000;
beforeEach(() => {
  clock = 1_000;
  svc = createMockInvitationService({ delayMs: 0, storage: memoryStorage(), now: () => new Date(clock++) });
});

const make = (id: string, ownerId = 'u1') =>
  createInvitation({ id, ownerId, themeId: 'wedding', templateId: 'wedding-1', today: new Date(2026, 9, 15) });

describe('invitations', () => {
  it('saves and lists only the owner invitations, newest first', async () => {
    await svc.save({ ...make('a'), name: '첫 번째' });
    await svc.save({ ...make('b'), name: '두 번째' });
    await svc.save({ ...make('c', 'someone-else'), name: '남의 것' });
    const list = await svc.list('u1');
    expect(list.map((i) => i.name)).toEqual(['두 번째', '첫 번째']);
  });
  it('updates an existing invitation in place and bumps updatedAt', async () => {
    const first = await svc.save({ ...make('a'), name: '초안' });
    const second = await svc.save({ ...first, name: '완성', status: 'final' });
    expect((await svc.list('u1')).length).toBe(1);
    expect(second.updatedAt > first.updatedAt).toBe(true);
    expect((await svc.get('a'))?.status).toBe('final');
  });
  it('returns null for unknown ids and removes invitations', async () => {
    expect(await svc.get('nope')).toBeNull();
    await svc.save(make('a'));
    await svc.remove('a');
    expect(await svc.get('a')).toBeNull();
  });
});

describe('guestbook', () => {
  beforeEach(async () => {
    await svc.save(make('inv'));
  });
  it('adds entries newest first without exposing passwords', async () => {
    await svc.addGuestbook('inv', { name: '홍길동', password: '1234', content: '축하해!' });
    await svc.addGuestbook('inv', { name: '김나미', password: 'abcd', content: '다컸네' });
    const list = await svc.listGuestbook('inv');
    expect(list.map((e) => e.name)).toEqual(['김나미', '홍길동']);
    expect(list[0]).not.toHaveProperty('password');
  });
  it('rejects invalid entries', async () => {
    await expect(svc.addGuestbook('inv', { name: '', password: '1', content: '' })).rejects.toThrow('INVALID');
  });
  it('deletes with the right password only', async () => {
    const e = await svc.addGuestbook('inv', { name: '홍길동', password: '1234', content: '축하해!' });
    expect(await svc.removeGuestbook('inv', e.id, { password: '0000' })).toBe('wrong_password');
    expect(await svc.removeGuestbook('inv', e.id, { password: '1234' })).toBe('ok');
    expect(await svc.listGuestbook('inv')).toEqual([]);
  });
  it('lets the invitation owner delete without a password', async () => {
    const e = await svc.addGuestbook('inv', { name: '오타쿠', password: '9999', content: '####' });
    expect(await svc.removeGuestbook('inv', e.id, { ownerId: 'someone' })).toBe('wrong_password');
    expect(await svc.removeGuestbook('inv', e.id, { ownerId: 'u1' })).toBe('ok');
  });
  it('reports missing entries', async () => {
    expect(await svc.removeGuestbook('inv', 'ghost', { password: '1234' })).toBe('not_found');
  });
  it('이름 바꾸기 (앞뒤 공백 제거)', async () => {
    await svc.save(make('a'));
    const r = await svc.rename('a', '  새 이름 ');
    expect(r.name).toBe('새 이름');
    expect((await svc.get('a'))?.name).toBe('새 이름');
  });
  it('방명록 확인 시각 저장', async () => {
    await svc.save(make('a'));
    await svc.markGuestbookSeen('a', '2026-10-20T00:00:00.000Z');
    expect((await svc.get('a'))?.guestbookSeenAt).toBe('2026-10-20T00:00:00.000Z');
  });
  it('예전 저장본의 번호는 처음 보정할 때 저장되어 다음에도 같다', async () => {
    const storage = memoryStorage();
    const old = { ...make('old'), status: 'active' } as Record<string, unknown>;
    delete old.number;
    await storage.setItem('wuzu.mock.invitations.v1', JSON.stringify({ invitations: [old], guestbook: [] }));
    const s = createMockInvitationService({ delayMs: 0, storage });
    const first = await s.get('old');
    const second = await s.get('old');
    expect(first?.status).toBe('final');
    expect(first?.number).toMatch(/^\d{11}$/);
    expect(second?.number).toBe(first?.number);
  });
});
