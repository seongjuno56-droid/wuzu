import { createInvitation } from '../../features/invitation/themes';
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

describe('서버가 가진 값 보호', () => {
  // 활성화·확인 시각은 지갑·방명록 경로가 저장소에 직접 쓰는 값이라, 테스트도 저장소에 직접 넣는다
  const withStored = async (patch: Record<string, unknown>) => {
    const storage = memoryStorage();
    const s = createMockInvitationService({ delayMs: 0, storage });
    const saved = await s.save({ ...make('a'), status: 'final' });
    const db = JSON.parse((await storage.getItem('wuzu.mock.invitations.v1'))!);
    db.invitations[0] = { ...db.invitations[0], ...patch };
    await storage.setItem('wuzu.mock.invitations.v1', JSON.stringify(db));
    return { s, saved };
  };

  it('저장할 때 번호·활성화 기간·제재·방명록 확인 시각은 저장본 값을 지킨다', async () => {
    const past = { activatedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-02T00:00:00.000Z', guestbookSeenAt: '2026-01-01T00:00:00.000Z' };
    const { s, saved } = await withStored(past);
    // 낡은 편집본(활성화 전 사본)으로 무료 저장 — 기한만료 상태라 무료 저장 가능
    const r = await s.save({ ...saved, name: '낡은 편집본', number: '99999999999', banned: false });
    expect(r.name).toBe('낡은 편집본');
    expect(r.number).toBe(saved.number);
    expect(r.activatedAt).toBe(past.activatedAt);
    expect(r.expiresAt).toBe(past.expiresAt);
    expect(r.guestbookSeenAt).toBe(past.guestbookSeenAt);
  });

  it('활성화 중인 초대장은 무료 저장을 거부한다(수정은 레터 사용)', async () => {
    const { s, saved } = await withStored({ activatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() });
    await expect(s.save({ ...saved, name: '무료로 바꿈' })).rejects.toThrow('PAID_EDIT_REQUIRED');
    expect((await s.get('a'))?.name).not.toBe('무료로 바꿈');
  });
});

describe('예전 저장본 보정(보기 형태·디자인)', () => {
  it('viewMode·design 이 없는 초대장도 스토리형·형식으로 불러온다', async () => {
    const storage = memoryStorage();
    const old = { ...make('old'), status: 'final' } as Record<string, unknown>;
    delete old.viewMode;
    delete old.design;
    await storage.setItem('wuzu.mock.invitations.v1', JSON.stringify({ invitations: [old], guestbook: [] }));
    const s = createMockInvitationService({ delayMs: 0, storage });
    const got = await s.get('old');
    expect(got?.viewMode).toBe('story');
    expect(got?.design).toEqual({});
    const [listed] = await s.list('u1');
    expect(listed.viewMode).toBe('story');
  });
});

describe('applyOrder 와 getBySlug (mock)', () => {
  const NOW = new Date(2026, 9, 20, 12);
  let at = NOW;
  let s: ReturnType<typeof createMockInvitationService>;
  const final = (id: string) => ({ ...make(id), name: '초대장', status: 'final' as const });
  beforeEach(async () => {
    at = NOW;
    s = createMockInvitationService({ delayMs: 0, storage: memoryStorage(), now: () => at });
    await s.save(final('a'));
  });

  it('첫 활성화에 slug 를 만들고, 다시 활성화해도 그대로다', async () => {
    const first = await s.applyOrder({ kind: 'activate', invitationId: 'a', extendDays: 0 });
    if (!first.ok) throw new Error('활성화 실패');
    expect(first.invitation.slug).toBeTruthy();
    at = new Date(2027, 0, 1);
    const again = await s.applyOrder({ kind: 'activate', invitationId: 'a', extendDays: 0 });
    expect(again.ok && again.invitation.slug).toBe(first.invitation.slug);
  });

  it('없으면 not_found, 지금 상태에서 할 수 없으면 invalid 이고 바뀌지 않는다', async () => {
    expect(await s.applyOrder({ kind: 'activate', invitationId: 'z', extendDays: 0 })).toEqual({ ok: false, reason: 'not_found' });
    expect(await s.applyOrder({ kind: 'extend', invitationId: 'a', extendDays: 30 })).toEqual({ ok: false, reason: 'invalid' });
    expect((await s.get('a'))?.expiresAt).toBeUndefined();
  });

  it('getBySlug: 활성화 중이면 초대장, 만료면 상태만, 그 밖에는 not_found', async () => {
    expect(await s.getBySlug('nope')).toEqual({ state: 'not_found' });
    // slug 가 없는 mock 저장본은 id 로도 열린다. 활성화 전이므로 not_found
    expect(await s.getBySlug('a')).toEqual({ state: 'not_found' });
    const r = await s.applyOrder({ kind: 'activate', invitationId: 'a', extendDays: 0 });
    const slug = r.ok ? r.invitation.slug! : '';
    expect((await s.getBySlug(slug)).invitation?.id).toBe('a');
    expect((await s.getBySlug('a')).state).toBe('active');
    at = new Date(2027, 0, 1);
    expect(await s.getBySlug(slug)).toEqual({ state: 'expired' });
  });

  it('일반 저장은 낡은 편집본의 slug 로 덮어쓰지 않는다', async () => {
    const r = await s.applyOrder({ kind: 'activate', invitationId: 'a', extendDays: 0 });
    const slug = r.ok ? r.invitation.slug : undefined;
    at = new Date(2027, 0, 1);
    const saved = await s.save({ ...final('a'), slug: 'stale' });
    expect(saved.slug).toBe(slug);
  });
});
