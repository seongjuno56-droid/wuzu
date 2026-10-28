import { Invitation, normalizeInvitation } from '../../features/invitation/model';
import type { GuestbookEntry, KeyValueStorage } from '../types';

export const INVITATIONS_KEY = 'wuzu.mock.invitations.v1';

export interface StoredEntry extends GuestbookEntry {
  password: string;
}
export interface Db {
  invitations: Invitation[];
  guestbook: StoredEntry[];
}

/** 초대장·방명록 저장소 — 초대장 서비스와 지갑 서비스가 같이 쓴다 */
export function createInvitationStore(storage: KeyValueStorage) {
  async function save(db: Db) {
    await storage.setItem(INVITATIONS_KEY, JSON.stringify(db));
  }
  async function load(): Promise<Db> {
    const raw = await storage.getItem(INVITATIONS_KEY);
    const db: Db = raw ? JSON.parse(raw) : { invitations: [], guestbook: [] };
    let changed = false;
    const invitations = db.invitations.map((inv) => {
      const r = normalizeInvitation(inv);
      changed ||= r.changed;
      return r.invitation;
    });
    const next = { ...db, invitations };
    // 보정한 값(특히 초대장 번호)이 매번 새로 만들어지지 않도록 바로 저장
    if (changed) await save(next);
    return next;
  }
  return { load, save };
}
