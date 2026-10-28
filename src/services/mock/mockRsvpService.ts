import { isRsvpClosed, RsvpInput, RsvpResponse, validateRsvp } from '../../features/rsvp/rsvp';
import type { KeyValueStorage, RsvpService } from '../types';

export const RSVP_KEY = 'wuzu.mock.rsvp.v1';

/** 참석 응답 — 초대장과 따로 저장한다 (서버가 생기면 같은 인터페이스로 바꾼다) */
export function createMockRsvpService(opts: {
  delayMs: number;
  storage: KeyValueStorage;
  now?: () => Date;
}): RsvpService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const load = async (): Promise<RsvpResponse[]> => JSON.parse((await storage.getItem(RSVP_KEY)) ?? '[]');
  const save = (rows: RsvpResponse[]) => storage.setItem(RSVP_KEY, JSON.stringify(rows));
  // 불참이면 동반 인원은 0 으로 둔다
  const clean = (input: RsvpInput): RsvpInput => ({
    name: input.name.trim(),
    attending: input.attending,
    org: input.org.trim(),
    phone: input.phone.trim(),
    companions: input.attending ? input.companions : 0,
  });
  const newRow = (invitationId: string, input: RsvpInput, source: RsvpResponse['source']): RsvpResponse => {
    const at = now().toISOString();
    return {
      ...clean(input),
      id: `r-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      invitationId,
      source,
      createdAt: at,
      updatedAt: at,
    };
  };

  return {
    async list(invitationId) {
      await wait();
      return (await load())
        .filter((r) => r.invitationId === invitationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(invitationId, id) {
      await wait();
      return (await load()).find((r) => r.invitationId === invitationId && r.id === id) ?? null;
    },
    async submit({ invitationId, themeId, deadline, input, id }) {
      await wait();
      if (isRsvpClosed(deadline, now())) return { ok: false, reason: 'closed' };
      if (validateRsvp(input, themeId).length) return { ok: false, reason: 'invalid' };
      const rows = await load();
      const idx = id ? rows.findIndex((r) => r.invitationId === invitationId && r.id === id) : -1;
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...clean(input), updatedAt: now().toISOString() };
        await save(rows);
        return { ok: true, response: rows[idx], created: false };
      }
      const row = newRow(invitationId, input, 'guest');
      await save([...rows, row]);
      return { ok: true, response: row, created: true };
    },
    async addManual(invitationId, themeId, input) {
      await wait();
      if (validateRsvp(input, themeId).length) throw new Error('INVALID');
      const row = newRow(invitationId, input, 'manual');
      await save([...(await load()), row]);
      return row;
    },
    async update(invitationId, themeId, id, input) {
      await wait();
      if (validateRsvp(input, themeId).length) throw new Error('INVALID');
      const rows = await load();
      const idx = rows.findIndex((r) => r.invitationId === invitationId && r.id === id);
      if (idx < 0) throw new Error('NOT_FOUND');
      rows[idx] = { ...rows[idx], ...clean(input), updatedAt: now().toISOString() };
      await save(rows);
      return rows[idx];
    },
    async remove(invitationId, id) {
      await wait();
      await save((await load()).filter((r) => !(r.invitationId === invitationId && r.id === id)));
    },
  };
}
