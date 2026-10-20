import { Invitation, isValidInvitationName, validateGuestbookEntry } from '../../features/invitation/model';
import { screenStatus } from '../../features/invitation/status';
import { GuestbookEntry, GuestbookInput, InvitationService, KeyValueStorage, RemoveGuestbookAuth } from '../types';
import { createInvitationStore, StoredEntry } from './invitationStore';

export function createMockInvitationService(opts: {
  delayMs: number;
  storage: KeyValueStorage;
  now?: () => Date;
}): InvitationService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));

  const { load, save } = createInvitationStore(storage);
  const strip = ({ password: _p, ...e }: StoredEntry): GuestbookEntry => e;

  return {
    async list(ownerId) {
      await wait();
      return (await load()).invitations
        .filter((i) => i.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async get(id) {
      await wait();
      return (await load()).invitations.find((i) => i.id === id) ?? null;
    },

    async save(invitation) {
      await wait();
      const db = await load();
      const idx = db.invitations.findIndex((i) => i.id === invitation.id);
      const stored = idx >= 0 ? db.invitations[idx] : null;
      // 활성화 중인 초대장의 내용 변경은 레터를 쓰는 수정(지갑 spend)으로만
      if (stored && screenStatus(stored, now()) === 'active') throw new Error('PAID_EDIT_REQUIRED');
      // 번호·작성자·제작일·활성화 기간·제재·방명록 확인 시각은 서버(저장본) 값을 지킨다 — 낡은 편집본이 덮어쓰지 않게
      const saved: Invitation = stored
        ? {
            ...invitation,
            number: stored.number,
            ownerId: stored.ownerId,
            createdAt: stored.createdAt,
            activatedAt: stored.activatedAt,
            expiresAt: stored.expiresAt,
            banned: stored.banned,
            guestbookSeenAt: stored.guestbookSeenAt,
            updatedAt: now().toISOString(),
          }
        : { ...invitation, updatedAt: now().toISOString() };
      if (idx >= 0) db.invitations[idx] = saved;
      else db.invitations.push(saved);
      await save(db);
      return saved;
    },

    async remove(id) {
      await wait();
      const db = await load();
      db.invitations = db.invitations.filter((i) => i.id !== id);
      db.guestbook = db.guestbook.filter((e) => e.invitationId !== id);
      await save(db);
    },

    async rename(id, name) {
      await wait();
      if (!isValidInvitationName(name)) throw new Error('INVALID');
      const db = await load();
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) throw new Error('NOT_FOUND');
      inv.name = name.trim();
      inv.updatedAt = now().toISOString();
      await save(db);
      return inv;
    },

    async markGuestbookSeen(id, at) {
      await wait();
      const db = await load();
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) return;
      inv.guestbookSeenAt = at;
      await save(db);
    },

    async listGuestbook(invitationId) {
      await wait();
      return (await load()).guestbook
        .filter((e) => e.invitationId === invitationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(strip);
    },

    async addGuestbook(invitationId, input: GuestbookInput) {
      await wait();
      if (validateGuestbookEntry(input).length) throw new Error('INVALID');
      const db = await load();
      const entry: StoredEntry = {
        id: `g-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        invitationId,
        name: input.name.trim(),
        content: input.content,
        password: input.password,
        createdAt: now().toISOString(),
      };
      db.guestbook.push(entry);
      await save(db);
      return strip(entry);
    },

    async removeGuestbook(invitationId, entryId, auth: RemoveGuestbookAuth) {
      await wait();
      const db = await load();
      const entry = db.guestbook.find((e) => e.id === entryId && e.invitationId === invitationId);
      if (!entry) return 'not_found';
      const owner = db.invitations.find((i) => i.id === invitationId)?.ownerId;
      const allowed = 'ownerId' in auth ? auth.ownerId === owner : auth.password === entry.password;
      if (!allowed) return 'wrong_password';
      db.guestbook = db.guestbook.filter((e) => e !== entry);
      await save(db);
      return 'ok';
    },
  };
}
