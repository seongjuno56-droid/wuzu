import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { migrate } from '../migrate';
import { addMember, newEmptyDb, newTestDb } from '../../test/db';

/** 앱 Invitation 과 같은 모양 (없는 값은 키가 빠진다) */
type Inv = {
  id: string;
  ownerId: string;
  themeId: string;
  templateId: string;
  name: string;
  number: string;
  slug?: string;
  linkThumb: string | null;
  activatedAt?: string;
  expiresAt?: string;
  banned: boolean;
  guestbookSeenAt?: string;
  status: 'draft' | 'final';
  enabled: Record<string, boolean>;
  order: string[];
  content: Record<string, unknown>;
  viewMode: string;
  paletteId: string | null;
  design: Record<string, unknown>;
  completed: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};
type OrderResult = { ok: true; invitation: Inv } | { ok: false; reason: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OTHER_ID = '11111111-1111-1111-1111-111111111111';

const sample = (over: Record<string, unknown> = {}) => ({
  themeId: 'wedding',
  templateId: 'w1',
  name: '우리 결혼식',
  status: 'draft',
  enabled: { gallery: true },
  order: ['gallery', 'ceremony'],
  content: { theme: 'wedding', greeting: { content: '안녕하세요' } },
  viewMode: 'scroll',
  paletteId: 'rose',
  design: { cover: { nodes: [] } },
  completed: { basic: true },
  linkThumb: 'r2://invitations/a/thumb.jpg',
  ...over,
});

async function asMember<T>(db: Db, id: string, fn: () => Promise<T>): Promise<T> {
  await db.query(`set role authenticated`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  try {
    return await fn();
  } finally {
    await db.query(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

async function asAnon<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  await db.query(`set role anon`);
  try {
    return await fn();
  } finally {
    await db.query(`reset role`);
  }
}

async function rpc<T>(db: Db, sql: string, params: unknown[] = []): Promise<T> {
  const [row] = await db.query<{ r: T }>(`select ${sql} as r`, params);
  return row.r;
}

const save = (db: Db, member: string, id: string | null, data: Record<string, unknown>) =>
  asMember(db, member, () => rpc<Inv>(db, `save_my_invitation($1::uuid, $2::jsonb)`, [id, JSON.stringify(data)]));

const get = (db: Db, member: string, id: string) =>
  asMember(db, member, () => rpc<Inv | null>(db, `get_my_invitation($1::uuid)`, [id]));

const list = (db: Db, member: string) => asMember(db, member, () => rpc<Inv[]>(db, `list_my_invitations()`));

const order = (db: Db, member: string, o: Record<string, unknown>) =>
  asMember(db, member, () => rpc<OrderResult>(db, `apply_invitation_order($1::jsonb)`, [JSON.stringify(o)]));

async function okOrder(db: Db, member: string, o: Record<string, unknown>): Promise<Inv> {
  const r = await order(db, member, o);
  if (!r.ok) throw new Error(`주문 실패: ${r.reason}`);
  return r.invitation;
}

/** 최종저장까지 마친 비활성화 초대장 */
const newFinal = async (db: Db, member: string) => (await save(db, member, null, sample({ status: 'final' }))).id;

/** 활성화 중인 초대장 */
async function newActive(db: Db, member: string): Promise<Inv> {
  const id = await newFinal(db, member);
  return okOrder(db, member, { kind: 'activate', invitationId: id, extendDays: 0 });
}

const expire = (db: Db, id: string) =>
  db.query(`update invitations set expires_at = now() - interval '1 minute' where id = $1`, [id]);

const member = (db: Db, name = '회원') => addMember(db, { name });

describe('본인 초대장 저장·조회', () => {
  it('p_id 가 null 이면 새로 만들고 uuid 와 11자리 번호를 준다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await save(db, a, null, sample());
    expect(inv.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inv.number).toMatch(/^[1-9][0-9]{10}$/);
    expect(inv.ownerId).toBe(a);
    expect(inv.banned).toBe(false);
  });

  it('앱이 보낸 내용을 Invitation 모양 그대로 돌려준다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const data = sample();
    const inv = await save(db, a, null, data);
    expect(inv).toMatchObject(data);
    expect(inv.createdAt).toMatch(ISO_UTC);
    expect(inv.updatedAt).toMatch(ISO_UTC);
    // 값이 없는 선택 칸은 키가 빠져 앱 타입(activatedAt?: string)과 맞는다
    expect(inv).not.toHaveProperty('activatedAt');
    expect(inv).not.toHaveProperty('expiresAt');
    expect(inv).not.toHaveProperty('guestbookSeenAt');
    expect(await get(db, a, inv.id)).toEqual(inv);
  });

  it('저장은 내용을 통째로 바꾼다. 썸네일을 null 로 보내면 지워진다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const first = await save(db, a, null, sample());
    const next = await save(db, a, first.id, sample({ name: ' 새 이름 ', linkThumb: null, paletteId: null }));
    expect(next.id).toBe(first.id);
    expect(next.number).toBe(first.number);
    expect(next.name).toBe('새 이름');
    expect(next.linkThumb).toBeNull();
    expect(next.paletteId).toBeNull();
  });

  it('내용이 맞지 않으면 INVALID', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const bad: Record<string, unknown>[] = [
      { themeId: 'birthday' },
      { templateId: '' },
      { name: '   ' },
      { name: '가'.repeat(31) },
      { name: 1 },
      { status: 'active' },
      { viewMode: 'grid' },
      { content: null },
      { content: [] },
      { order: {} },
      { enabled: [] },
      { design: 'x' },
      { completed: 1 },
      { linkThumb: 1 },
      { paletteId: {} },
    ];
    for (const over of bad) {
      await expect(save(db, a, null, sample(over)), JSON.stringify(over)).rejects.toThrow(/INVALID/);
    }
    expect(await list(db, a)).toEqual([]);
  });

  it('1MB 를 넘는 초대장은 저장·수정 주문이 거부된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const big = (n: number) => sample({ content: { theme: 'wedding', pad: 'x'.repeat(n) } });
    const MB = 1024 * 1024;

    // 새로 만들기
    await expect(save(db, a, null, big(MB))).rejects.toThrow(/INVALID/);
    expect(await list(db, a)).toEqual([]);

    // 한도 안이면 되고, 고쳐 저장할 때도 같은 한도다
    const ok = await save(db, a, null, big(MB - 2000));
    await expect(save(db, a, ok.id, big(MB))).rejects.toThrow(/INVALID/);

    // 활성화 중 수정 주문
    const active = await newActive(db, a);
    expect(await order(db, a, { kind: 'edit', invitation: { ...big(MB), id: active.id } })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect((await get(db, a, active.id))?.content).toEqual(active.content);
    expect((await order(db, a, { kind: 'edit', invitation: { ...big(MB - 2000), id: active.id } })).ok).toBe(true);
  });

  it('목록은 내 초대장만 최근 수정순이다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const one = await save(db, a, null, sample({ name: '하나' }));
    const two = await save(db, a, null, sample({ name: '둘' }));
    await save(db, b, null, sample({ name: '남의 것' }));
    await db.query(`update invitations set updated_at = now() - interval '1 day' where id = $1`, [two.id]);
    expect((await list(db, a)).map((i) => i.id)).toEqual([one.id, two.id]);
    await db.query(`update invitations set updated_at = now() - interval '2 day' where id = $1`, [one.id]);
    expect((await list(db, a)).map((i) => i.id)).toEqual([two.id, one.id]);
  });

  it('없으면 목록은 빈 배열, 조회는 null', async () => {
    const db = await newTestDb();
    const a = await member(db);
    expect(await list(db, a)).toEqual([]);
    expect(await get(db, a, OTHER_ID)).toBeNull();
  });

  it('이름 바꾸기는 앞뒤 공백을 지우고, 길이가 맞지 않으면 INVALID', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await save(db, a, null, sample());
    const r = await asMember(db, a, () => rpc<Inv>(db, `rename_my_invitation($1::uuid, $2)`, [inv.id, '  새 이름 ']));
    expect(r.name).toBe('새 이름');
    await expect(
      asMember(db, a, () => rpc(db, `rename_my_invitation($1::uuid, $2)`, [inv.id, '  '])),
    ).rejects.toThrow(/INVALID/);
    await expect(
      asMember(db, a, () => rpc(db, `rename_my_invitation($1::uuid, $2)`, [inv.id, '가'.repeat(31)])),
    ).rejects.toThrow(/INVALID/);
  });

  it('활성화 중에도 이름은 바꿀 수 있다(mock 과 같다)', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const r = await asMember(db, a, () => rpc<Inv>(db, `rename_my_invitation($1::uuid, $2)`, [inv.id, '새 이름']));
    expect(r.name).toBe('새 이름');
    expect(r.slug).toBe(inv.slug);
  });

  it('방명록 확인 시각을 저장하고, 수정 시각은 건드리지 않는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await save(db, a, null, sample());
    const at = '2026-11-04T01:02:03.456Z';
    await asMember(db, a, () => rpc(db, `mark_guestbook_seen($1::uuid, $2::timestamptz)`, [inv.id, at]));
    const r = await get(db, a, inv.id);
    expect(r?.guestbookSeenAt).toBe(at);
    expect(r?.updatedAt).toBe(inv.updatedAt);
  });

  it('지우면 방명록도 같이 지워진다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await save(db, a, null, sample());
    await db.query(
      `insert into guestbook_entries(invitation_id, name, password_hash, content) values ($1, '하객', 'x', '축하')`,
      [inv.id],
    );
    await asMember(db, a, () => rpc(db, `remove_my_invitation($1::uuid)`, [inv.id]));
    expect(await get(db, a, inv.id)).toBeNull();
    const [g] = await db.query<{ n: number }>(`select count(*)::int as n from guestbook_entries`);
    expect(g.n).toBe(0);
  });
});

describe('소유자 확인', () => {
  it('남의 초대장은 목록·조회·저장·삭제가 안 된다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const inv = await save(db, a, null, sample());

    expect(await list(db, b)).toEqual([]);
    expect(await get(db, b, inv.id)).toBeNull();
    await expect(save(db, b, inv.id, sample({ name: '가로채기' }))).rejects.toThrow(/NOT_FOUND/);
    await expect(
      asMember(db, b, () => rpc(db, `rename_my_invitation($1::uuid, $2)`, [inv.id, '가로채기'])),
    ).rejects.toThrow(/NOT_FOUND/);
    await asMember(db, b, () => rpc(db, `mark_guestbook_seen($1::uuid, now())`, [inv.id]));
    await asMember(db, b, () => rpc(db, `remove_my_invitation($1::uuid)`, [inv.id]));
    expect(await order(db, b, { kind: 'activate', invitationId: inv.id, extendDays: 0 })).toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect(await order(db, b, { kind: 'edit', invitation: sample({ id: inv.id, status: 'final' }) })).toEqual({
      ok: false,
      reason: 'not_found',
    });

    // 그대로 남아 있다
    expect(await get(db, a, inv.id)).toEqual(inv);
  });

  it('없는 id 로 저장하면 NOT_FOUND 이고 새로 만들지 않는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    await expect(save(db, a, OTHER_ID, sample())).rejects.toThrow(/NOT_FOUND/);
    expect(await list(db, a)).toEqual([]);
  });

  it('앱이 보낸 number·owner_id·activated_at·expires_at·banned·slug 는 무시한다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const forged = {
      id: OTHER_ID,
      number: '12345678901',
      ownerId: b,
      owner_id: b,
      activatedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      banned: true,
      slug: 'forged-slug-value',
      guestbookSeenAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };

    // 새로 만들 때
    const created = await save(db, a, null, sample(forged));
    expect(created.id).not.toBe(OTHER_ID);
    expect(created.number).not.toBe(forged.number);
    expect(created.ownerId).toBe(a);
    expect(created.banned).toBe(false);
    expect(created).not.toHaveProperty('slug');
    expect(created).not.toHaveProperty('activatedAt');
    expect(created).not.toHaveProperty('expiresAt');
    expect(created).not.toHaveProperty('guestbookSeenAt');
    expect(created.createdAt.startsWith('2020')).toBe(false);

    // 고칠 때
    const updated = await save(db, a, created.id, sample(forged));
    expect(updated.id).toBe(created.id);
    expect(updated.number).toBe(created.number);
    expect(updated.ownerId).toBe(a);
    expect(updated.banned).toBe(false);
    expect(updated).not.toHaveProperty('slug');
    expect(updated).not.toHaveProperty('expiresAt');
    expect(updated.createdAt).toBe(created.createdAt);

    // 유료 수정에서도 (id 만 대상을 정하는 데 쓴다)
    const active = await newActive(db, a);
    const edited = await okOrder(db, a, {
      kind: 'edit',
      invitation: sample({ ...forged, id: active.id, name: '수정됨' }),
    });
    expect(edited.name).toBe('수정됨');
    expect(edited.number).toBe(active.number);
    expect(edited.ownerId).toBe(a);
    expect(edited.slug).toBe(active.slug);
    expect(edited.activatedAt).toBe(active.activatedAt);
    expect(edited.expiresAt).toBe(active.expiresAt);
    expect(edited.banned).toBe(false);
    expect(edited.createdAt).toBe(active.createdAt);
    expect(edited).not.toHaveProperty('guestbookSeenAt');
  });
});

describe('활성화 중 저장', () => {
  it('활성화 중이면 save 가 PAID_EDIT_REQUIRED 로 거부된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await expect(save(db, a, inv.id, sample({ name: '몰래 수정' }))).rejects.toThrow(/PAID_EDIT_REQUIRED/);
    expect((await get(db, a, inv.id))?.name).toBe(inv.name);
  });

  it('만료 뒤에는 일반 저장이 되고 기간·slug 를 지킨다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await expire(db, inv.id);
    const before = await get(db, a, inv.id);
    const saved = await save(db, a, inv.id, sample({ name: '만료 후 수정', status: 'final' }));
    expect(saved.name).toBe('만료 후 수정');
    expect(saved.slug).toBe(inv.slug);
    expect(saved.expiresAt).toBe(before?.expiresAt);
  });

  it('숨김 초대장을 저장해도 숨김이 풀리지 않는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await db.query(`update invitations set banned = true where id = $1`, [inv.id]);
    const saved = await save(db, a, inv.id, sample({ banned: false }));
    expect(saved.banned).toBe(true);
  });
});

describe('활성화·연장·수정', () => {
  it('첫 활성화에 slug(10자 이상)가 생기고 기간은 15일이다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newFinal(db, a);
    const inv = await okOrder(db, a, { kind: 'activate', invitationId: id, extendDays: 0 });
    expect(inv.slug).toMatch(/^[0-9A-Za-z]{12}$/);
    expect(inv.activatedAt).toMatch(ISO_UTC);
    expect(inv.expiresAt).toMatch(ISO_UTC);
    expect(Date.parse(inv.expiresAt!) - Date.parse(inv.activatedAt!)).toBe(15 * DAY_MS);
    expect(await get(db, a, id)).toEqual(inv);
  });

  it('활성화에 연장을 함께 사면 그만큼 더한다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newFinal(db, a);
    const inv = await okOrder(db, a, { kind: 'activate', invitationId: id, extendDays: 30 });
    expect(Date.parse(inv.expiresAt!) - Date.parse(inv.activatedAt!)).toBe(45 * DAY_MS);
  });

  it('초대장마다 slug 가 다르다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const one = await newActive(db, a);
    const two = await newActive(db, a);
    expect(one.slug).not.toBe(two.slug);
  });

  it('연장·수정·만료 후 재활성화에도 slug 가 그대로다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const slug = inv.slug;
    expect(slug).toBeTruthy();

    // 연장: 지금 만료일에 더한다
    const extended = await okOrder(db, a, { kind: 'extend', invitationId: inv.id, extendDays: 30 });
    expect(extended.slug).toBe(slug);
    expect(Date.parse(extended.expiresAt!) - Date.parse(inv.expiresAt!)).toBe(30 * DAY_MS);
    expect(extended.activatedAt).toBe(inv.activatedAt);

    // 수정: 내용만 바뀌고 기간은 그대로, 상태는 final
    const edited = await okOrder(db, a, {
      kind: 'edit',
      invitation: sample({ id: inv.id, name: '수정본', status: 'draft' }),
    });
    expect(edited.slug).toBe(slug);
    expect(edited.name).toBe('수정본');
    expect(edited.status).toBe('final');
    expect(edited.expiresAt).toBe(extended.expiresAt);

    // 만료 뒤 재활성화: 기간은 지금부터 새로
    await expire(db, inv.id);
    const again = await okOrder(db, a, { kind: 'activate', invitationId: inv.id, extendDays: 0 });
    expect(again.slug).toBe(slug);
    expect(Date.parse(again.expiresAt!) - Date.parse(again.activatedAt!)).toBe(15 * DAY_MS);
    expect(Date.parse(again.activatedAt!)).toBeGreaterThanOrEqual(Date.parse(inv.activatedAt!));
  });

  it('수정은 방명록 확인 시각을 지킨다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const at = '2026-11-04T01:02:03.456Z';
    await asMember(db, a, () => rpc(db, `mark_guestbook_seen($1::uuid, $2::timestamptz)`, [inv.id, at]));
    const edited = await okOrder(db, a, { kind: 'edit', invitation: sample({ id: inv.id, guestbookSeenAt: null }) });
    expect(edited.guestbookSeenAt).toBe(at);
  });

  it('작성 중에는 slug 가 null 이다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const draft = await save(db, a, null, sample());
    expect(draft).not.toHaveProperty('slug');
    const final = await save(db, a, draft.id, sample({ status: 'final' }));
    expect(final).not.toHaveProperty('slug');
    const [row] = await db.query<{ slug: string | null }>(`select slug from invitations where id = $1`, [draft.id]);
    expect(row.slug).toBeNull();

    // 활성화가 거절되면 slug 가 생기지 않는다
    const other = await save(db, a, null, sample());
    await order(db, a, { kind: 'activate', invitationId: other.id, extendDays: 0 });
    const [r2] = await db.query<{ slug: string | null }>(`select slug from invitations where id = $1`, [other.id]);
    expect(r2.slug).toBeNull();
  });

  it('banned 초대장은 blocked, 상태가 맞지 않으면 invalid', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const blocked = { ok: false, reason: 'blocked' };
    const invalid = { ok: false, reason: 'invalid' };

    const banned = await newActive(db, a);
    await db.query(`update invitations set banned = true where id = $1`, [banned.id]);
    expect(await order(db, a, { kind: 'activate', invitationId: banned.id, extendDays: 0 })).toEqual(blocked);
    expect(await order(db, a, { kind: 'extend', invitationId: banned.id, extendDays: 30 })).toEqual(blocked);
    expect(await order(db, a, { kind: 'edit', invitation: sample({ id: banned.id }) })).toEqual(blocked);

    const draft = await save(db, a, null, sample());
    expect(await order(db, a, { kind: 'activate', invitationId: draft.id, extendDays: 0 })).toEqual(invalid);
    expect(await order(db, a, { kind: 'extend', invitationId: draft.id, extendDays: 30 })).toEqual(invalid);
    expect(await order(db, a, { kind: 'edit', invitation: sample({ id: draft.id }) })).toEqual(invalid);

    const inactive = await newFinal(db, a);
    expect(await order(db, a, { kind: 'extend', invitationId: inactive, extendDays: 30 })).toEqual(invalid);
    expect(await order(db, a, { kind: 'edit', invitation: sample({ id: inactive }) })).toEqual(invalid);

    const active = await newActive(db, a);
    expect(await order(db, a, { kind: 'activate', invitationId: active.id, extendDays: 0 })).toEqual(invalid);

    const expired = await newActive(db, a);
    await expire(db, expired.id);
    expect(await order(db, a, { kind: 'extend', invitationId: expired.id, extendDays: 30 })).toEqual(invalid);
    expect(await order(db, a, { kind: 'edit', invitation: sample({ id: expired.id }) })).toEqual(invalid);
  });

  it('정한 일수 밖의 주문·잘못된 주문은 invalid 이고 기간이 바뀌지 않는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const invalid = { ok: false, reason: 'invalid' };
    const inactive = await newFinal(db, a);
    for (const extendDays of [1, 15, -15, 100000, 30.5, null, 'x']) {
      expect(await order(db, a, { kind: 'activate', invitationId: inactive, extendDays })).toEqual(invalid);
    }
    expect(await order(db, a, { kind: 'activate', invitationId: inactive })).toEqual(invalid);

    const active = await newActive(db, a);
    for (const extendDays of [0, 1, -30, 100000, null]) {
      expect(await order(db, a, { kind: 'extend', invitationId: active.id, extendDays })).toEqual(invalid);
    }
    expect((await get(db, a, active.id))?.expiresAt).toBe(active.expiresAt);

    expect(await order(db, a, { kind: 'charge', invitationId: active.id })).toEqual(invalid);
    expect(await order(db, a, { invitationId: active.id })).toEqual(invalid);
    expect(await order(db, a, { kind: 'edit' })).toEqual(invalid);
    expect(await order(db, a, { kind: 'activate', extendDays: 0 })).toEqual(invalid);
    expect(await order(db, a, { kind: 'edit', invitation: sample({ id: active.id, themeId: 'x' }) })).toEqual(invalid);
    expect((await get(db, a, active.id))?.themeId).toBe('wedding');
  });

  it('uuid 가 아닌 id 는 not_found', async () => {
    const db = await newTestDb();
    const a = await member(db);
    expect(await order(db, a, { kind: 'activate', invitationId: 'inv-abc', extendDays: 0 })).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});

describe('회원 상태', () => {
  it('정지 회원은 쓰기가 account_unavailable, 탈퇴 신청 회원은 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const draft = await save(db, a, null, sample());

    await db.query(`update profiles set status = 'withdrawing' where id = $1`, [a]);
    await save(db, a, draft.id, sample({ name: '탈퇴 신청 중 저장' }));

    await db.query(`update profiles set status = 'banned' where id = $1`, [a]);
    const unavailable = /account_unavailable/;
    await expect(save(db, a, null, sample())).rejects.toThrow(unavailable);
    await expect(save(db, a, draft.id, sample())).rejects.toThrow(unavailable);
    await expect(order(db, a, { kind: 'extend', invitationId: inv.id, extendDays: 30 })).rejects.toThrow(unavailable);
    await expect(
      asMember(db, a, () => rpc(db, `rename_my_invitation($1::uuid, 'x')`, [draft.id])),
    ).rejects.toThrow(unavailable);
    await expect(asMember(db, a, () => rpc(db, `remove_my_invitation($1::uuid)`, [draft.id]))).rejects.toThrow(
      unavailable,
    );

    // 읽기는 된다
    expect((await list(db, a)).length).toBe(2);
  });
});

const PUBLIC_RPCS = [
  `list_my_invitations()`,
  `get_my_invitation('${OTHER_ID}')`,
  `save_my_invitation(null, '{}')`,
  `rename_my_invitation('${OTHER_ID}', 'x')`,
  `remove_my_invitation('${OTHER_ID}')`,
  `mark_guestbook_seen('${OTHER_ID}', now())`,
  `apply_invitation_order('{}')`,
];
const INTERNAL_RPCS = [
  `new_invitation_slug()`,
  `new_invitation_number()`,
  `iso_utc(now())`,
  `valid_invitation_data('{}')`,
  `update_invitation_content('${OTHER_ID}', '{}')`,
];
const ROW_FUNCTIONS = ['invitation_json', 'invitation_screen_status'];

async function expectAnonBlocked(db: Db, a: string): Promise<void> {
  for (const sql of [
    `select * from invitations`,
    `update invitations set banned = false`,
    `delete from invitations`,
    `insert into invitations(owner_id, number, theme_id, template_id, name, content)
     values ('${a}', '12345678901', 'wedding', 'w1', 'x', '{}')`,
  ]) {
    await expect(asAnon(db, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
    await expect(asMember(db, a, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
  }
  for (const call of [...PUBLIC_RPCS, ...INTERNAL_RPCS]) {
    await expect(asAnon(db, () => db.query(`select ${call}`)), call).rejects.toThrow(/permission denied/);
  }
  for (const call of INTERNAL_RPCS) {
    await expect(asMember(db, a, () => db.query(`select ${call}`)), call).rejects.toThrow(/permission denied/);
  }
  // 표 행을 받는 내부 함수는 직접 부르기 어려워 권한 표로 본다
  const rows = await db.query<{ name: string; anon: boolean; member: boolean }>(
    `select proname as name,
            has_function_privilege('anon', oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', oid, 'EXECUTE') as member
       from pg_proc where pronamespace = 'public'::regnamespace and proname = any($1)`,
    [ROW_FUNCTIONS],
  );
  expect(rows.length).toBe(ROW_FUNCTIONS.length);
  expect(rows.filter((r) => r.anon || r.member)).toEqual([]);
  // public 의 어떤 함수도 anon 에게 열려 있지 않다(하객 전용 guest_ 함수만 예외, Task 3)
  const open = await db.query<{ name: string }>(
    `select proname as name from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname not like 'guest\\_%'
        and has_function_privilege('anon', oid, 'EXECUTE')`,
  );
  expect(open).toEqual([]);
}

describe('권한', () => {
  it('anon 은 표·RPC 모두 접근이 막힌다', async () => {
    const db = await newTestDb();
    await expectAnonBlocked(db, await member(db));
  });

  it('Supabase 기본 권한(새 표·함수를 anon 에게 여는 설정)에서도 막힌다', async () => {
    // 운영 Supabase 는 public 의 새 표·함수를 기본으로 anon·authenticated 에 연다. 그 설정을 흉내 내고 올린다
    const db = await newEmptyDb();
    await db.query(`create role anon; create role authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;`);
    await migrate(db, { withAuthStub: true });
    await expectAnonBlocked(db, await member(db));
  });
});
