import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { migrate } from '../migrate';
import { addMember, newEmptyDb, newTestDb } from '../../test/db';

type Entry = { id: string; invitationId: string; name: string; content: string; createdAt: string };
type Response = {
  id: string;
  invitationId: string;
  name: string;
  attending: boolean;
  org: string;
  phone: string;
  companions: number;
  source: 'guest' | 'manual';
  createdAt: string;
  updatedAt: string;
};
type Fail = { ok: false; reason: string };
type GuestView = { state: string; invitation?: Record<string, unknown> };
type Submit = { ok: true; response: Response; token: string; created: boolean } | Fail;
type AddEntry = { ok: true; entry: Entry } | Fail;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OTHER_ID = '11111111-1111-1111-1111-111111111111';
const FAIL = (reason: string) => ({ ok: false, reason });

/** 한국 날짜(앱의 마감일은 한국 달력 기준 문자열이다) */
const kstDate = (offsetDays = 0) =>
  new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

const content = (themeId: string, deadline: string) => ({ theme: themeId, rsvp: { deadline } });

const sample = (over: Record<string, unknown> = {}) => ({
  themeId: 'wedding',
  templateId: 'w1',
  name: '우리 결혼식',
  status: 'final',
  enabled: { guestbook: true },
  order: ['ceremony'],
  content: { theme: 'wedding', greeting: { content: '안녕하세요' } },
  viewMode: 'scroll',
  paletteId: 'rose',
  design: { cover: { nodes: [] } },
  completed: { basic: true },
  linkThumb: 'r2://invitations/a/thumb.jpg',
  ...over,
});
const meetup = (deadline = '', over: Record<string, unknown> = {}) =>
  sample({ themeId: 'meetup', templateId: 'm1', enabled: { guestbook: true, rsvp: true }, content: content('meetup', deadline), ...over });
const corporate = (deadline = '') =>
  sample({ themeId: 'corporate', templateId: 'c1', enabled: { rsvp: true }, content: content('corporate', deadline) });

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

/** 작성 중까지만 만든 초대장 */
const saveInv = (db: Db, member: string, data: Record<string, unknown>, id: string | null = null) =>
  asMember(db, member, () =>
    rpc<{ id: string; slug?: string }>(db, `save_my_invitation($1::uuid, $2::jsonb)`, [id, JSON.stringify(data)]),
  );

/** 활성화까지 마친 초대장 */
async function newActive(db: Db, member: string, data: Record<string, unknown> = sample()) {
  const inv = await saveInv(db, member, data);
  const r = await asMember(db, member, () =>
    rpc<{ ok: boolean; invitation: { id: string; slug: string } }>(db, `apply_invitation_order($1::jsonb)`, [
      JSON.stringify({ kind: 'activate', invitationId: inv.id, extendDays: 0 }),
    ]),
  );
  if (!r.ok) throw new Error('활성화 실패');
  return r.invitation;
}

const expire = (db: Db, id: string) =>
  db.query(`update invitations set expires_at = now() - interval '1 minute' where id = $1`, [id]);
const ban = (db: Db, id: string) => db.query(`update invitations set banned = true where id = $1`, [id]);

const view = (db: Db, slug: string | null) =>
  asAnon(db, () => rpc<GuestView>(db, `guest_invitation($1)`, [slug]));
const listEntries = (db: Db, id: string) =>
  asAnon(db, () => rpc<Entry[]>(db, `guest_list_guestbook($1::uuid)`, [id]));
const addEntry = (db: Db, id: string, name = '하객', password = '1234', text = '축하해요') =>
  asAnon(db, () =>
    rpc<AddEntry>(db, `guest_add_guestbook($1::uuid, $2, $3, $4)`, [id, name, password, text]),
  );
const removeEntry = (db: Db, id: string, entry: string, password: string | null) =>
  asAnon(db, () => rpc<{ ok: boolean; reason?: string }>(db, `guest_remove_guestbook($1::uuid, $2::uuid, $3)`, [id, entry, password]));

const meetupInput = (over: Record<string, unknown> = {}) => ({
  name: '김하객',
  attending: true,
  org: '',
  phone: '',
  companions: 1,
  ...over,
});
const corporateInput = (over: Record<string, unknown> = {}) => ({
  name: '김하객',
  attending: true,
  org: '어썸피플즈',
  phone: '010-1234-5678',
  companions: 0,
  ...over,
});
const submit = (db: Db, id: string, input: unknown, response: string | null = null, token: string | null = null) =>
  asAnon(db, () =>
    rpc<Submit>(db, `guest_rsvp_submit($1::uuid, $2::jsonb, $3::uuid, $4)`, [id, JSON.stringify(input), response, token]),
  );
async function okSubmit(db: Db, id: string, input: unknown = meetupInput()) {
  const r = await submit(db, id, input);
  if (!r.ok) throw new Error(`제출 실패: ${r.reason}`);
  return r;
}
const getResponse = (db: Db, id: string, response: string, token: string | null) =>
  asAnon(db, () => rpc<Response | null>(db, `guest_rsvp_get($1::uuid, $2::uuid, $3)`, [id, response, token]));

const count = async (db: Db, table: 'guestbook_entries' | 'rsvp_responses') => {
  const [r] = await db.query<{ n: number }>(`select count(*)::int as n from ${table}`);
  return r.n;
};
const member = (db: Db, name = '회원') => addMember(db, { name });
/** 지금 쓰기 창을 미래로 옮긴다. 테스트 도중 분이 바뀌어 횟수가 초기화되지 않게 */
const freezeWindow = (db: Db, id: string) =>
  db.query(`update guest_write_rate set window_start = now() + interval '1 hour' where invitation_id = $1`, [id]);
/** 분당 칸을 한도까지 채운다 */
const fillBucket = (db: Db, id: string, bucket: 'write' | 'attempt') =>
  db.query(
    `insert into guest_write_rate(invitation_id, bucket, window_start, n) values ($1, $2, now() + interval '1 hour', 30)
     on conflict (invitation_id, bucket) do update set window_start = excluded.window_start, n = 30`,
    [id, bucket],
  );

describe('하객 읽기', () => {
  it('활성화 중 초대장만 내용을 준다. 작성 중·없는 주소·숨김·삭제는 not_found, 만료는 expired 이고 내용이 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const notFound = { state: 'not_found' };

    const active = await newActive(db, a);
    const got = await view(db, active.slug);
    expect(got.state).toBe('active');
    expect(got.invitation?.name).toBe('우리 결혼식');
    expect(got.invitation?.slug).toBe(active.slug);

    // 없는 주소
    expect(await view(db, 'no-such-slug-value')).toEqual(notFound);
    expect(await view(db, '')).toEqual(notFound);
    expect(await view(db, null)).toEqual(notFound);

    // 숨김 (만료된 숨김도 같다)
    const banned = await newActive(db, a);
    await ban(db, banned.id);
    expect(await view(db, banned.slug)).toEqual(notFound);
    await expire(db, banned.id);
    expect(await view(db, banned.slug)).toEqual(notFound);

    // 만료
    const expired = await newActive(db, a);
    await expire(db, expired.id);
    expect(await view(db, expired.slug)).toEqual({ state: 'expired' });

    // 만료 뒤 다시 작성 중으로 저장하면 slug 가 남아 있어도 없는 것과 같다
    await saveInv(db, a, sample({ status: 'draft' }), expired.id);
    expect(await view(db, expired.slug)).toEqual(notFound);

    // 활성화 전: slug 칸을 직접 넣어도 내용을 주지 않는다
    const final = await saveInv(db, a, sample());
    await db.query(`update invitations set slug = 'inactive-slug-1' where id = $1`, [final.id]);
    expect(await view(db, 'inactive-slug-1')).toEqual(notFound);

    // 삭제
    const removed = await newActive(db, a);
    await asMember(db, a, () => rpc(db, `remove_my_invitation($1::uuid)`, [removed.id]));
    expect(await view(db, removed.slug)).toEqual(notFound);
  });

  it('돌려준 값에 owner_id·guestbook_seen_at·completed 가 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await asMember(db, a, () => rpc(db, `mark_guestbook_seen($1::uuid, now())`, [inv.id]));

    const { invitation } = await view(db, inv.slug);
    // 표시에 쓰는 값만 허용 목록으로 준다. 칸이 늘어도 저절로 나가지 않는다
    expect(Object.keys(invitation!).sort()).toEqual(
      [
        'banned',
        'content',
        'design',
        'enabled',
        'expiresAt',
        'id',
        'linkThumb',
        'name',
        'order',
        'paletteId',
        'slug',
        'status',
        'templateId',
        'themeId',
        'viewMode',
      ].sort(),
    );
    expect(invitation!.expiresAt).toMatch(ISO_UTC);
    expect(JSON.stringify(invitation)).not.toContain(a);
  });

  it('꺼 둔 항목의 내용과 디자인은 하객에게 나가지 않고, 켠 항목은 그대로다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const fullContent = {
      theme: 'wedding',
      basic: { groom: { name: '신랑' } },
      ceremony: { venue: '예식장' },
      greeting: { content: '인사말' },
      account: { message: '안내', groom: { bank: '우주은행', number: '110-999-888777' } },
      gallery: { photos: ['r2://gallery-photo'] },
      guestbook: { style: 1 },
      ending: { content: '엔딩 비밀 문구' },
      bgm: { uri: 'r2://secret-bgm', fileName: 'song.mp3' },
    };
    const design = {
      cover: { mode: 'canvas', canvas: { text: '표지' } },
      gallery: { mode: 'canvas', canvas: { text: '갤러리 디자인' } },
      account: { mode: 'canvas', canvas: { text: '110-999-888777' } },
      ending: { mode: 'canvas', canvas: { text: '엔딩 디자인' } },
    };
    const inv = await newActive(
      db,
      a,
      sample({
        content: fullContent,
        design,
        enabled: { account: false, gallery: true, guestbook: true, bgm: false },
      }),
    );
    const { invitation } = await view(db, inv.slug);
    const body = JSON.stringify(invitation);
    expect(body).not.toContain('110-999-888777');
    expect(body).not.toContain('우주은행');
    expect(body).not.toContain('secret-bgm');
    expect(body).not.toContain('엔딩 비밀 문구');
    expect(body).not.toContain('엔딩 디자인');
    expect(invitation!.content).toEqual({
      theme: 'wedding',
      basic: fullContent.basic,
      ceremony: fullContent.ceremony,
      greeting: fullContent.greeting,
      gallery: fullContent.gallery,
      guestbook: fullContent.guestbook,
    });
    expect(invitation!.design).toEqual({ cover: design.cover, gallery: design.gallery });

    // 만든 사람의 저장본은 그대로다
    const mine = await asMember(db, a, () =>
      rpc<{ content: unknown; design: unknown }>(db, `get_my_invitation($1::uuid)`, [inv.id]),
    );
    expect(mine.content).toEqual(fullContent);
    expect(mine.design).toEqual(design);

    // 켜면 나간다
    await db.query(`update invitations set enabled = '{"account": true}' where id = $1`, [inv.id]);
    expect(JSON.stringify((await view(db, inv.slug)).invitation)).toContain('110-999-888777');
  });

  it('테마별로 켜고 끄는 항목이 모두 걸러지고 늘 켜진 항목은 남는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const part = { x: 1 };
    const themes: [string, string[], string[]][] = [
      ['wedding', ['basic', 'ceremony', 'greeting'], ['account', 'gallery', 'guestbook', 'ending', 'bgm']],
      ['dol', ['basic', 'ceremony', 'greeting'], ['profile', 'timeline', 'account', 'gallery', 'guestbook', 'ending', 'bgm']],
      ['corporate', ['basic', 'ceremony', 'greeting', 'directions'], ['program', 'speakers', 'rsvp', 'contact', 'ending', 'bgm']],
      ['meetup', ['basic', 'ceremony', 'greeting'], ['program', 'notices', 'gallery', 'guestbook', 'rsvp', 'account', 'ending', 'bgm']],
    ];
    for (const [theme, fixed, optional] of themes) {
      const c: Record<string, unknown> = { theme };
      for (const k of [...fixed, ...optional]) c[k] = part;
      const off = await newActive(db, a, sample({ themeId: theme, content: c, enabled: {} }));
      expect(Object.keys((await view(db, off.slug)).invitation!.content as object).sort(), theme).toEqual(
        ['theme', ...fixed].sort(),
      );
      const enabled = Object.fromEntries(optional.map((k) => [k, true]));
      const on = await newActive(db, a, sample({ themeId: theme, content: c, enabled }));
      expect((await view(db, on.slug)).invitation!.content, theme).toEqual(c);
    }
  });

  it('정지·탈퇴 신청 회원의 초대장도 열린다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    for (const status of ['banned', 'withdrawing']) {
      await db.query(`update profiles set status = $1 where id = $2`, [status, a]);
      expect((await view(db, inv.slug)).state).toBe('active');
      expect((await addEntry(db, inv.id)).ok).toBe(true);
      expect((await okSubmit(db, inv.id)).ok).toBe(true);
    }
    expect((await listEntries(db, inv.id)).length).toBe(2);
  });
});

describe('방명록', () => {
  it('방명록 목록에 password_hash·숨긴 글이 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const first = await addEntry(db, inv.id, '  하객1  ', '1234', ' 앞뒤 공백은 그대로 ');
    const second = await addEntry(db, inv.id, '하객2');
    if (!first.ok || !second.ok) throw new Error('작성 실패');
    expect(first.entry).toEqual({
      id: first.entry.id,
      invitationId: inv.id,
      name: '하객1',
      content: ' 앞뒤 공백은 그대로 ',
      createdAt: expect.stringMatching(ISO_UTC),
    });
    await db.query(`update guestbook_entries set created_at = now() - interval '1 hour' where id = $1`, [first.entry.id]);
    await db.query(`update guestbook_entries set hidden = true where id = $1`, [second.entry.id]);

    const third = await addEntry(db, inv.id, '하객3');
    if (!third.ok) throw new Error('작성 실패');
    const list = await listEntries(db, inv.id);
    // 최신순, 숨긴 글 없음
    expect(list.map((e) => e.name)).toEqual(['하객3', '하객1']);
    expect(Object.keys(list[0]).sort()).toEqual(['content', 'createdAt', 'id', 'invitationId', 'name']);
    expect(JSON.stringify(list)).not.toMatch(/password|hash|\$2/);

    // 숨긴 글은 비밀번호를 맞춰도 지울 수 없다
    expect(await removeEntry(db, inv.id, second.entry.id, '1234')).toEqual(FAIL('not_found'));
  });

  it('하객 목록은 보이는 글 중 최신 200건만, 만든 사람 목록은 전부 준다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await db.query(
      `insert into guestbook_entries(invitation_id, name, password_hash, content, created_at)
       select $1, '글' || g, 'x', '내용', now() - g * interval '1 minute' from generate_series(1, 201) g`,
      [inv.id],
    );
    // 가장 최신이어도 숨긴 글은 200건에 들지 않는다
    await db.query(
      `insert into guestbook_entries(invitation_id, name, password_hash, content, hidden) values ($1, '숨김', 'x', '내용', true)`,
      [inv.id],
    );
    const list = await listEntries(db, inv.id);
    expect(list).toHaveLength(200);
    expect(list[0].name).toBe('글1');
    expect(list[199].name).toBe('글200');
    expect(list.map((e) => e.name)).not.toContain('글201');
    expect(list.map((e) => e.name)).not.toContain('숨김');

    const all = await asMember(db, a, () => rpc<Entry[]>(db, `owner_list_guestbook($1::uuid)`, [inv.id]));
    expect(all).toHaveLength(201);
    expect(all[200].name).toBe('글201');
  });

  it('비밀번호가 틀리면 삭제 안 되고 wrong_password, 해시로 저장된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const other = await newActive(db, a);
    const added = await addEntry(db, inv.id, '하객', 'pass1234');
    if (!added.ok) throw new Error('작성 실패');

    const [row] = await db.query<{ password_hash: string }>(`select password_hash from guestbook_entries`);
    expect(row.password_hash).not.toContain('pass1234');
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);

    for (const bad of ['wrong1234', 'pass12345', 'PASS1234', '', 'x'.repeat(1000), null]) {
      expect(await removeEntry(db, inv.id, added.entry.id, bad), String(bad)).toEqual(FAIL('wrong_password'));
    }
    // 다른 초대장 ID 로는 찾을 수 없다
    expect(await removeEntry(db, other.id, added.entry.id, 'pass1234')).toEqual(FAIL('not_found'));
    expect(await removeEntry(db, inv.id, OTHER_ID, 'pass1234')).toEqual(FAIL('not_found'));
    expect(await count(db, 'guestbook_entries')).toBe(1);

    expect(await removeEntry(db, inv.id, added.entry.id, 'pass1234')).toEqual({ ok: true });
    expect(await count(db, 'guestbook_entries')).toBe(0);
  });

  it('입력 규칙은 validateGuestbookEntry 와 같다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const invalid = FAIL('invalid');

    const bad: [string, string, string][] = [
      ['', '1234', '내용'],
      ['   ', '1234', '내용'],
      // 전각 공백(한글 입력기)·줄바꿈도 JS trim 처럼 빈 값이다
      ['　\n\t', '1234', '내용'],
      ['가'.repeat(11), '1234', '내용'],
      // 앱의 length 는 UTF-16 단위라 이모지 하나가 2다
      ['😀'.repeat(6), '1234', '내용'],
      ['이름', '123', '내용'],
      ['이름', 'x'.repeat(21), '내용'],
      ['이름', '😀'.repeat(11), '내용'],
      ['이름', '1234', ''],
      ['이름', '1234', ' 　\n'],
      ['이름', '1234', '가'.repeat(301)],
      ['이름', '1234', '😀'.repeat(151)],
    ];
    for (const [name, password, text] of bad) {
      expect(await addEntry(db, inv.id, name, password, text), name + password + text.length).toEqual(invalid);
    }
    // null 도 거절하고 오류를 던지지 않는다
    expect(
      await asAnon(db, () =>
        rpc(db, `guest_add_guestbook($1::uuid, null, null, null)`, [inv.id]),
      ),
    ).toEqual(invalid);
    expect(await count(db, 'guestbook_entries')).toBe(0);

    const good: [string, string, string][] = [
      ['가'.repeat(10), '1234', '가'.repeat(300)],
      // 앞뒤 공백을 뺀 이름이 10자면 된다
      [`　${'가'.repeat(10)} `, 'x'.repeat(20), '내용'],
      ['😀'.repeat(5), '😀'.repeat(10), '😀'.repeat(150)],
      // 비밀번호는 다듬지 않고 그 길이 그대로 본다
      ['이름', '    ', '내용'],
    ];
    for (const [name, password, text] of good) {
      expect((await addEntry(db, inv.id, name, password, text)).ok, name).toBe(true);
    }
    expect(await count(db, 'guestbook_entries')).toBe(good.length);
    const stored = await listEntries(db, inv.id);
    expect(stored.map((e) => e.name)).toContain('가'.repeat(10));
  });

  it('방명록을 끈 초대장·방명록이 없는 테마는 쓰기가 closed 이고 목록이 비어 있다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const added = await addEntry(db, inv.id);
    if (!added.ok) throw new Error('작성 실패');

    await db.query(`update invitations set enabled = '{"guestbook": false}' where id = $1`, [inv.id]);
    expect(await addEntry(db, inv.id)).toEqual(FAIL('closed'));
    expect(await listEntries(db, inv.id)).toEqual([]);

    const corp = await newActive(db, a, corporate());
    expect(await addEntry(db, corp.id)).toEqual(FAIL('closed'));
  });
});

describe('활성화 중이 아닌 초대장', () => {
  it('활성화 중이 아니면 방명록·응답 쓰기가 거부된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const notFound = FAIL('not_found');

    const open = await newActive(db, a, meetup());
    const entry = await addEntry(db, open.id, '하객', '1234');
    const resp = await okSubmit(db, open.id);
    if (!entry.ok) throw new Error('작성 실패');
    const before = { entries: await count(db, 'guestbook_entries'), resp: await count(db, 'rsvp_responses') };

    const expectClosed = async (id: string, entryId: string, respId: string, token: string) => {
      expect(await addEntry(db, id)).toEqual(notFound);
      expect(await removeEntry(db, id, entryId, '1234')).toEqual(notFound);
      expect(await submit(db, id, meetupInput())).toEqual(notFound);
      expect(await submit(db, id, meetupInput({ name: '고침' }), respId, token)).toEqual(notFound);
      // 읽기도 내용 없이 끝난다
      expect(await listEntries(db, id)).toEqual([]);
      expect(await getResponse(db, id, respId, token)).toBeNull();
    };

    // 만료
    await expire(db, open.id);
    await expectClosed(open.id, entry.entry.id, resp.response.id, resp.token);
    // 숨김
    await db.query(`update invitations set expires_at = now() + interval '1 day', banned = true where id = $1`, [open.id]);
    await expectClosed(open.id, entry.entry.id, resp.response.id, resp.token);
    // 작성 중
    await db.query(`update invitations set banned = false, status = 'draft' where id = $1`, [open.id]);
    await expectClosed(open.id, entry.entry.id, resp.response.id, resp.token);
    // 비활성화
    await db.query(`update invitations set status = 'final', expires_at = null where id = $1`, [open.id]);
    await expectClosed(open.id, entry.entry.id, resp.response.id, resp.token);
    // 없는 초대장
    await expectClosed(OTHER_ID, entry.entry.id, resp.response.id, resp.token);

    expect(await count(db, 'guestbook_entries')).toBe(before.entries);
    expect(await count(db, 'rsvp_responses')).toBe(before.resp);
  });
});

describe('참석 응답', () => {
  it('제출하면 응답·토큰을 주고, 토큰은 해시만 저장한다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const r = await okSubmit(db, inv.id, meetupInput({ name: '  김하객 ' }));
    expect(r.created).toBe(true);
    expect(r.token).toMatch(/^[0-9a-f]{64}$/);
    expect(r.response).toEqual({
      id: r.response.id,
      invitationId: inv.id,
      name: '김하객',
      attending: true,
      org: '',
      phone: '',
      companions: 1,
      source: 'guest',
      createdAt: expect.stringMatching(ISO_UTC),
      updatedAt: expect.stringMatching(ISO_UTC),
    });
    const [row] = await db.query<{ guest_token_hash: string }>(`select guest_token_hash from rsvp_responses`);
    expect(row.guest_token_hash).toBeTruthy();
    expect(row.guest_token_hash).not.toContain(r.token);
    expect(JSON.stringify(r.response)).not.toContain(row.guest_token_hash);

    const other = await okSubmit(db, inv.id);
    expect(other.token).not.toBe(r.token);
  });

  it('응답 ID 만으로는 읽거나 고치지 못하고 토큰이 있어야 한다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const other = await newActive(db, a, meetup());
    const mine = await okSubmit(db, inv.id);
    const theirs = await okSubmit(db, inv.id);
    const rid = mine.response.id;

    // 읽기
    for (const token of [null, '', 'x', theirs.token, mine.token.toUpperCase()]) {
      expect(await getResponse(db, inv.id, rid, token), String(token)).toBeNull();
    }
    expect(await getResponse(db, other.id, rid, mine.token)).toBeNull();
    expect(await getResponse(db, inv.id, rid, mine.token)).toEqual(mine.response);

    // 고치기: 실패하면 아무것도 바뀌지 않고 새 행도 생기지 않는다
    const n = await count(db, 'rsvp_responses');
    for (const token of [null, '', theirs.token]) {
      expect(await submit(db, inv.id, meetupInput({ name: '가로채기' }), rid, token), String(token)).toEqual(
        FAIL('not_found'),
      );
    }
    expect(await submit(db, other.id, meetupInput({ name: '가로채기' }), rid, mine.token)).toEqual(FAIL('not_found'));
    expect(await count(db, 'rsvp_responses')).toBe(n);
    expect((await getResponse(db, inv.id, rid, mine.token))?.name).toBe('김하객');

    // 토큰이 맞으면 고친다
    const next = await submit(db, inv.id, meetupInput({ name: '고친이름', attending: false, companions: 5 }), rid, mine.token);
    if (!next.ok) throw new Error(next.reason);
    expect(next.created).toBe(false);
    expect(next.token).toBe(mine.token);
    expect(next.response.id).toBe(rid);
    expect(next.response.name).toBe('고친이름');
    // 불참이면 동반 인원은 0
    expect(next.response.companions).toBe(0);
    expect(next.response.createdAt).toBe(mine.response.createdAt);
    expect(await count(db, 'rsvp_responses')).toBe(n);
  });

  it('만든 사람이 넣은 행은 토큰이 없어 하객이 고칠 수 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const manual = await asMember(db, a, () =>
      rpc<Response>(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, JSON.stringify(meetupInput())]),
    );
    expect(await getResponse(db, inv.id, manual.id, '')).toBeNull();
    expect(await submit(db, inv.id, meetupInput({ name: '가로채기' }), manual.id, '')).toEqual(FAIL('not_found'));
  });

  it('마감 뒤 제출은 closed, 입력 검사 위반은 invalid', async () => {
    const db = await newTestDb();
    const a = await member(db);

    // 마감일 당일까지 받는다. 마감은 입력 검사보다 먼저 본다(mock 과 같다)
    const past = await newActive(db, a, meetup(kstDate(-1)));
    expect(await submit(db, past.id, meetupInput())).toEqual(FAIL('closed'));
    expect(await submit(db, past.id, { name: '' })).toEqual(FAIL('closed'));
    const today = await newActive(db, a, meetup(kstDate()));
    expect((await submit(db, today.id, meetupInput())).ok).toBe(true);
    const none = await newActive(db, a, meetup(''));
    expect((await submit(db, none.id, meetupInput())).ok).toBe(true);
    // 날짜 모양이 아니면 마감 없음과 같다 (isDateString)
    const odd = await newActive(db, a, meetup('2020-1-1'));
    expect((await submit(db, odd.id, meetupInput())).ok).toBe(true);

    // 마감 뒤에는 자기 응답도 고칠 수 없다
    const mine = await okSubmit(db, today.id);
    await db.query(`update invitations set content = $1::jsonb where id = $2`, [
      JSON.stringify(content('meetup', kstDate(-1))),
      today.id,
    ]);
    expect(await submit(db, today.id, meetupInput({ name: '고침' }), mine.response.id, mine.token)).toEqual(FAIL('closed'));

    const invalid = FAIL('invalid');
    const meet = await newActive(db, a, meetup());
    const corp = await newActive(db, a, corporate());
    const n = await count(db, 'rsvp_responses');
    const badMeetup: unknown[] = [
      null,
      [],
      'x',
      {},
      meetupInput({ name: '' }),
      meetupInput({ name: '  　' }),
      meetupInput({ name: '가'.repeat(11) }),
      meetupInput({ name: '😀'.repeat(6) }),
      meetupInput({ name: 1 }),
      meetupInput({ attending: 'yes' }),
      meetupInput({ attending: undefined }),
      meetupInput({ companions: 10 }),
      meetupInput({ companions: -1 }),
      meetupInput({ companions: 1.5 }),
      meetupInput({ companions: '1' }),
      meetupInput({ companions: undefined }),
      meetupInput({ companions: 1e30 }),
    ];
    for (const input of badMeetup) {
      expect(await submit(db, meet.id, input), JSON.stringify(input)).toEqual(invalid);
    }
    const badCorporate: unknown[] = [
      corporateInput({ org: '' }),
      corporateInput({ org: ' ' }),
      corporateInput({ org: '가'.repeat(21) }),
      corporateInput({ org: 1 }),
      corporateInput({ phone: '' }),
      corporateInput({ phone: '1234' }),
      corporateInput({ phone: '010-12-5678' }),
      corporateInput({ phone: '010-1234-56789' }),
      corporateInput({ phone: '٠١٠-١٢٣٤-٥٦٧٨' }),
      corporateInput({ phone: '010-1234-5678\nx' }),
      corporateInput({ phone: 1012345678 }),
    ];
    for (const input of badCorporate) {
      expect(await submit(db, corp.id, input), JSON.stringify(input)).toEqual(invalid);
    }
    expect(await count(db, 'rsvp_responses')).toBe(n);

    // 받는 항목 밖의 값은 저장하지 않는다(길이 제한 없는 칸으로 저장량이 늘지 않게)
    const dropped = await okSubmit(db, meet.id, meetupInput({ org: 'x'.repeat(100000), phone: 'y'.repeat(100000) }));
    expect(dropped.response.org).toBe('');
    expect(dropped.response.phone).toBe('');
    const corpOk = await okSubmit(db, corp.id, corporateInput({ org: ' 소속 ', phone: ' 01012345678 ', companions: 99 }));
    expect(corpOk.response.org).toBe('소속');
    expect(corpOk.response.phone).toBe('01012345678');
    expect(corpOk.response.companions).toBe(0);
    // 불참이면 동반 인원을 검사하지 않는다 (validateRsvp)
    const absent = await okSubmit(db, meet.id, meetupInput({ attending: false, companions: 99 }));
    expect(absent.response.companions).toBe(0);
    for (const phone of ['02-123-4567', '010-1234-5678', '01012345678']) {
      expect((await submit(db, corp.id, corporateInput({ phone }))).ok, phone).toBe(true);
    }
  });

  it('마감일은 한국 시간으로 넘어간다', async () => {
    const db = await newTestDb();
    const closed = (deadline: string, at: string) =>
      rpc<boolean>(db, `rsvp_deadline_passed($1, $2::timestamptz)`, [deadline, at]);
    // 11월 5일 0시(한국) = 11월 4일 15시(UTC)
    expect(await closed('2026-11-04', '2026-11-04T14:59:59Z')).toBe(false);
    expect(await closed('2026-11-04', '2026-11-04T15:00:00Z')).toBe(true);
    expect(await closed('', '2026-11-04T15:00:00Z')).toBe(false);
  });

  it('응답을 받지 않는 초대장은 closed 다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const wedding = await newActive(db, a);
    expect(await submit(db, wedding.id, meetupInput())).toEqual(FAIL('closed'));
    const off = await newActive(db, a, meetup('', { enabled: { rsvp: false } }));
    expect(await submit(db, off.id, meetupInput())).toEqual(FAIL('closed'));
    expect(await count(db, 'rsvp_responses')).toBe(0);
  });
});

describe('작성 제한', () => {
  it('초대장당 분당 쓰기 30건, 방명록·응답 각 5000건을 넘으면 rate_limited', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const limited = FAIL('rate_limited');
    const inv = await newActive(db, a, meetup());
    const other = await newActive(db, a, meetup());

    // 방명록과 새 응답이 같은 칸을 쓴다
    expect((await addEntry(db, inv.id, '하객', '1234')).ok).toBe(true);
    await freezeWindow(db, inv.id);
    for (let i = 1; i < 30; i++) {
      expect((await submit(db, inv.id, meetupInput())).ok, String(i)).toBe(true);
    }
    const rows = await count(db, 'rsvp_responses');
    expect(await submit(db, inv.id, meetupInput())).toEqual(limited);
    expect(await addEntry(db, inv.id)).toEqual(limited);
    expect(await count(db, 'rsvp_responses')).toBe(rows);
    expect(await count(db, 'guestbook_entries')).toBe(1);

    // 입력이 틀린 요청은 칸을 쓰지 않는다
    expect(await submit(db, inv.id, { name: '' })).toEqual(FAIL('invalid'));

    // 다른 초대장은 따로 센다
    expect((await addEntry(db, other.id)).ok).toBe(true);

    // 읽기는 막히지 않는다
    expect((await view(db, inv.slug)).state).toBe('active');
    expect((await listEntries(db, inv.id)).length).toBe(1);

    // 다음 분이면 다시 된다
    await db.query(`update guest_write_rate set window_start = now() - interval '1 minute' where invitation_id = $1`, [inv.id]);
    expect((await submit(db, inv.id, meetupInput())).ok).toBe(true);
  });

  it('비밀번호·토큰 시도 칸이 차도 새 글과 새 응답은 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const limited = FAIL('rate_limited');
    const inv = await newActive(db, a, meetup());
    const added = await addEntry(db, inv.id, '하객', '1234');
    const resp = await okSubmit(db, inv.id);
    if (!added.ok) throw new Error('작성 실패');

    await fillBucket(db, inv.id, 'attempt');
    expect(await removeEntry(db, inv.id, added.entry.id, '1234')).toEqual(limited);
    expect(await submit(db, inv.id, meetupInput({ name: '고침' }), resp.response.id, resp.token)).toEqual(limited);
    expect(await count(db, 'guestbook_entries')).toBe(1);
    expect((await getResponse(db, inv.id, resp.response.id, resp.token))?.name).toBe('김하객');

    expect((await addEntry(db, inv.id)).ok).toBe(true);
    expect((await submit(db, inv.id, meetupInput())).ok).toBe(true);
  });

  it('쓰기 칸이 차도 비밀번호 삭제와 자기 응답 고치기는 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const limited = FAIL('rate_limited');
    const inv = await newActive(db, a, meetup());
    const added = await addEntry(db, inv.id, '하객', '1234');
    const resp = await okSubmit(db, inv.id);
    if (!added.ok) throw new Error('작성 실패');

    await fillBucket(db, inv.id, 'write');
    expect(await addEntry(db, inv.id)).toEqual(limited);
    expect(await submit(db, inv.id, meetupInput())).toEqual(limited);

    expect((await submit(db, inv.id, meetupInput({ name: '고침' }), resp.response.id, resp.token)).ok).toBe(true);
    expect(await removeEntry(db, inv.id, added.entry.id, '1234')).toEqual({ ok: true });
  });

  it('틀린 비밀번호·토큰도 시도 칸에 세어 30번째 뒤로는 rate_limited 다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const added = await addEntry(db, inv.id, '하객', '1234');
    const resp = await okSubmit(db, inv.id);
    if (!added.ok) throw new Error('작성 실패');

    expect(await removeEntry(db, inv.id, added.entry.id, '9999')).toEqual(FAIL('wrong_password'));
    await freezeWindow(db, inv.id);
    await db.query(`update guest_write_rate set n = 28 where invitation_id = $1 and bucket = 'attempt'`, [inv.id]);
    expect(await removeEntry(db, inv.id, added.entry.id, '9999')).toEqual(FAIL('wrong_password'));
    expect(await submit(db, inv.id, meetupInput({ name: '고침' }), resp.response.id, 'f'.repeat(64))).toEqual(FAIL('not_found'));
    expect(await removeEntry(db, inv.id, added.entry.id, '1234')).toEqual(FAIL('rate_limited'));
    expect(await count(db, 'guestbook_entries')).toBe(1);
  });

  it('아주 긴 입력은 오류 없이 invalid·not_found·wrong_password 로 끝난다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const corp = await newActive(db, a, corporate());
    const added = await addEntry(db, inv.id, '하객', '1234');
    if (!added.ok) throw new Error('작성 실패');
    const huge = '가'.repeat(2_000_000);
    const blank = '\u3000'.repeat(2_000_000);

    // 없는 초대장: 입력을 다듬기 전에 끝난다
    expect(await addEntry(db, OTHER_ID, huge, huge, huge)).toEqual(FAIL('not_found'));
    expect(await removeEntry(db, OTHER_ID, added.entry.id, huge)).toEqual(FAIL('not_found'));
    expect(await submit(db, OTHER_ID, meetupInput({ name: huge }))).toEqual(FAIL('not_found'));
    expect(await view(db, huge)).toEqual({ state: 'not_found' });

    for (const [name, password, text] of [
      [huge, '1234', '내용'],
      [blank, '1234', '내용'],
      ['이름', huge, '내용'],
      ['이름', '1234', huge],
      ['이름', '1234', blank],
    ]) {
      expect(await addEntry(db, inv.id, name, password, text)).toEqual(FAIL('invalid'));
    }
    expect(await removeEntry(db, inv.id, added.entry.id, huge)).toEqual(FAIL('wrong_password'));
    expect(await submit(db, inv.id, meetupInput({ name: huge }))).toEqual(FAIL('invalid'));
    expect(await submit(db, inv.id, meetupInput({ name: blank }))).toEqual(FAIL('invalid'));
    expect(await submit(db, corp.id, corporateInput({ org: huge }))).toEqual(FAIL('invalid'));
    expect(await submit(db, corp.id, corporateInput({ phone: huge }))).toEqual(FAIL('invalid'));

    const resp = await okSubmit(db, inv.id);
    expect(await getResponse(db, inv.id, resp.response.id, huge)).toBeNull();
    expect(await submit(db, inv.id, meetupInput(), resp.response.id, huge)).toEqual(FAIL('not_found'));

    // 앱에서 허용되는 최대 길이는 그대로 된다
    expect((await addEntry(db, inv.id, '😀'.repeat(5), '가'.repeat(20), '가'.repeat(300))).ok).toBe(true);
  });

  it('방명록·응답이 각 5000건이면 새 글은 rate_limited, 자기 응답 고치기와 삭제는 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const entry = await addEntry(db, inv.id, '하객', '1234');
    const resp = await okSubmit(db, inv.id);
    if (!entry.ok) throw new Error('작성 실패');

    await db.query(
      `insert into guestbook_entries(invitation_id, name, password_hash, content)
       select $1, '하객', 'x', '글' from generate_series(1, 4998)`,
      [inv.id],
    );
    await db.query(
      `insert into rsvp_responses(invitation_id, name, attending, source)
       select $1, '하객', true, 'guest' from generate_series(1, 4998)`,
      [inv.id],
    );
    // 4999건: 한 건씩 더 된다
    expect((await addEntry(db, inv.id)).ok).toBe(true);
    expect((await submit(db, inv.id, meetupInput())).ok).toBe(true);
    expect(await count(db, 'guestbook_entries')).toBe(5000);
    expect(await count(db, 'rsvp_responses')).toBe(5000);

    expect(await addEntry(db, inv.id)).toEqual(FAIL('rate_limited'));
    expect(await submit(db, inv.id, meetupInput())).toEqual(FAIL('rate_limited'));
    expect(await count(db, 'guestbook_entries')).toBe(5000);
    expect(await count(db, 'rsvp_responses')).toBe(5000);

    expect((await submit(db, inv.id, meetupInput({ name: '고침' }), resp.response.id, resp.token)).ok).toBe(true);
    expect(await removeEntry(db, inv.id, entry.entry.id, '1234')).toEqual({ ok: true });
    expect((await addEntry(db, inv.id)).ok).toBe(true);
  });
});

describe('본인 전용', () => {
  it('참석자 명단은 anon·다른 회원이 못 본다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const inv = await newActive(db, a, meetup());
    const r = await okSubmit(db, inv.id, meetupInput({ name: '비밀참석자' }));

    await expect(asAnon(db, () => rpc(db, `owner_rsvp_list($1::uuid)`, [inv.id]))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`select * from rsvp_responses`))).rejects.toThrow(/permission denied/);

    expect(await asMember(db, b, () => rpc(db, `owner_rsvp_list($1::uuid)`, [inv.id]))).toEqual([]);
    await expect(asMember(db, b, () => db.query(`select * from rsvp_responses`))).rejects.toThrow(/permission denied/);

    const input = JSON.stringify(meetupInput({ name: '가로채기' }));
    await expect(
      asMember(db, b, () => rpc(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, input])),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      asMember(db, b, () => rpc(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [inv.id, r.response.id, input])),
    ).rejects.toThrow(/NOT_FOUND/);
    await asMember(db, b, () => rpc(db, `owner_rsvp_remove($1::uuid, $2::uuid)`, [inv.id, r.response.id]));

    // 다른 초대장 ID 를 붙여 남의 응답을 고칠 수도 없다
    const mine = await newActive(db, b, meetup());
    await expect(
      asMember(db, b, () => rpc(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [mine.id, r.response.id, input])),
    ).rejects.toThrow(/NOT_FOUND/);
    await asMember(db, b, () => rpc(db, `owner_rsvp_remove($1::uuid, $2::uuid)`, [mine.id, r.response.id]));

    // 만든 사람은 본다. 토큰 해시는 나오지 않는다
    const list = await asMember(db, a, () => rpc<Response[]>(db, `owner_rsvp_list($1::uuid)`, [inv.id]));
    expect(list.map((x) => x.name)).toEqual(['비밀참석자']);
    expect(Object.keys(list[0]).sort()).toEqual(Object.keys(r.response).sort());
  });

  it('만든 사람은 명단을 넣고 고치고 지울 수 있다. 마감·활성화와 상관없고 source 는 그대로다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const guest = await okSubmit(db, inv.id);
    await expire(db, inv.id);

    const manual = await asMember(db, a, () =>
      rpc<Response>(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, JSON.stringify(meetupInput({ name: ' 직접 ' }))]),
    );
    expect(manual.source).toBe('manual');
    expect(manual.name).toBe('직접');

    const edited = await asMember(db, a, () =>
      rpc<Response>(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [
        inv.id,
        guest.response.id,
        JSON.stringify(meetupInput({ name: '수정', attending: false })),
      ]),
    );
    expect(edited.name).toBe('수정');
    expect(edited.source).toBe('guest');
    expect(edited.companions).toBe(0);

    await db.query(`update rsvp_responses set created_at = now() - interval '1 hour' where id = $1`, [guest.response.id]);
    const list = await asMember(db, a, () => rpc<Response[]>(db, `owner_rsvp_list($1::uuid)`, [inv.id]));
    expect(list.map((r) => r.id)).toEqual([manual.id, guest.response.id]);

    for (const bad of [{ name: '' }, meetupInput({ companions: 10 })]) {
      await expect(
        asMember(db, a, () => rpc(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, JSON.stringify(bad)])),
      ).rejects.toThrow(/INVALID/);
      await expect(
        asMember(db, a, () =>
          rpc(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [inv.id, manual.id, JSON.stringify(bad)]),
        ),
      ).rejects.toThrow(/INVALID/);
    }
    await expect(
      asMember(db, a, () =>
        rpc(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [inv.id, OTHER_ID, JSON.stringify(meetupInput())]),
      ),
    ).rejects.toThrow(/NOT_FOUND/);

    await asMember(db, a, () => rpc(db, `owner_rsvp_remove($1::uuid, $2::uuid)`, [inv.id, manual.id]));
    expect(await asMember(db, a, () => rpc<Response[]>(db, `owner_rsvp_list($1::uuid)`, [inv.id]))).toHaveLength(1);
  });

  it('만든 사람이 직접 넣기도 5000건이면 RATE_LIMITED 이고, 지우면 다시 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    await db.query(
      `insert into rsvp_responses(invitation_id, name, attending, source)
       select $1, '하객', true, 'guest' from generate_series(1, 4999)`,
      [inv.id],
    );
    const add = () =>
      asMember(db, a, () =>
        rpc<Response>(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, JSON.stringify(meetupInput())]),
      );
    const last = await add();
    await expect(add()).rejects.toThrow(/RATE_LIMITED/);
    expect(await count(db, 'rsvp_responses')).toBe(5000);
    await asMember(db, a, () => rpc(db, `owner_rsvp_remove($1::uuid, $2::uuid)`, [inv.id, last.id]));
    expect((await add()).source).toBe('manual');
  });

  it('방명록 관리: 만든 사람만 비밀번호 없이 보고 지운다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const inv = await newActive(db, a);
    const added = await addEntry(db, inv.id, '하객', '1234');
    const hidden = await addEntry(db, inv.id, '숨김', '1234');
    if (!added.ok || !hidden.ok) throw new Error('작성 실패');
    await db.query(`update guestbook_entries set hidden = true where id = $1`, [hidden.entry.id]);
    await expire(db, inv.id);

    await expect(asAnon(db, () => rpc(db, `owner_list_guestbook($1::uuid)`, [inv.id]))).rejects.toThrow(/permission denied/);
    await expect(
      asAnon(db, () => rpc(db, `owner_remove_guestbook($1::uuid, $2::uuid)`, [inv.id, added.entry.id])),
    ).rejects.toThrow(/permission denied/);

    expect(await asMember(db, b, () => rpc(db, `owner_list_guestbook($1::uuid)`, [inv.id]))).toEqual([]);
    expect(
      await asMember(db, b, () => rpc(db, `owner_remove_guestbook($1::uuid, $2::uuid)`, [inv.id, added.entry.id])),
    ).toEqual(FAIL('not_found'));

    // 만료 뒤에도 만든 사람은 본다. 숨긴 글과 해시는 없다
    const list = await asMember(db, a, () => rpc<Entry[]>(db, `owner_list_guestbook($1::uuid)`, [inv.id]));
    expect(list.map((e) => e.name)).toEqual(['하객']);
    expect(JSON.stringify(list)).not.toMatch(/password|hash|\$2/);

    expect(
      await asMember(db, a, () => rpc(db, `owner_remove_guestbook($1::uuid, $2::uuid)`, [inv.id, added.entry.id])),
    ).toEqual({ ok: true });
    expect(await asMember(db, a, () => rpc(db, `owner_list_guestbook($1::uuid)`, [inv.id]))).toEqual([]);
  });

  it('정지 회원은 본인 쓰기가 account_unavailable, 읽기는 된다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a, meetup());
    const r = await okSubmit(db, inv.id);
    await db.query(`update profiles set status = 'banned' where id = $1`, [a]);
    const input = JSON.stringify(meetupInput());
    const unavailable = /account_unavailable/;
    await expect(
      asMember(db, a, () => rpc(db, `owner_rsvp_add($1::uuid, $2::jsonb)`, [inv.id, input])),
    ).rejects.toThrow(unavailable);
    await expect(
      asMember(db, a, () => rpc(db, `owner_rsvp_update($1::uuid, $2::uuid, $3::jsonb)`, [inv.id, r.response.id, input])),
    ).rejects.toThrow(unavailable);
    await expect(
      asMember(db, a, () => rpc(db, `owner_rsvp_remove($1::uuid, $2::uuid)`, [inv.id, r.response.id])),
    ).rejects.toThrow(unavailable);
    await expect(
      asMember(db, a, () => rpc(db, `owner_remove_guestbook($1::uuid, $2::uuid)`, [inv.id, OTHER_ID])),
    ).rejects.toThrow(unavailable);
    expect(await asMember(db, a, () => rpc<Response[]>(db, `owner_rsvp_list($1::uuid)`, [inv.id]))).toHaveLength(1);
  });

  it('초대장을 지우면 쓰기 횟수 기록도 함께 지워진다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    await addEntry(db, inv.id);
    await asMember(db, a, () => rpc(db, `remove_my_invitation($1::uuid)`, [inv.id]));
    const [r] = await db.query<{ n: number }>(`select count(*)::int as n from guest_write_rate`);
    expect(r.n).toBe(0);
  });
});

const GUEST_RPCS = [
  'guest_add_guestbook',
  'guest_invitation',
  'guest_list_guestbook',
  'guest_remove_guestbook',
  'guest_rsvp_get',
  'guest_rsvp_submit',
];
const OWNER_RPCS = [
  'owner_list_guestbook',
  'owner_remove_guestbook',
  'owner_rsvp_add',
  'owner_rsvp_list',
  'owner_rsvp_remove',
  'owner_rsvp_update',
];
const INTERNAL = [
  'js_trim',
  'js_length',
  'invitation_guest_json',
  'guestbook_entry_json',
  'rsvp_response_json',
  'visible_invitation_part',
  'invitation_has_guestbook',
  'invitation_takes_rsvp',
  'clean_rsvp_input',
  'rsvp_deadline_passed',
  'take_guest_write',
];

async function expectPermissions(db: Db, a: string): Promise<void> {
  const privileges = await db.query<{ name: string; anon: boolean; member: boolean; pub: boolean; definer: boolean; config: string[] | null }>(
    `select proname as name,
            has_function_privilege('anon', oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', oid, 'EXECUTE') as member,
            coalesce(aclexplode_public.has, false) as pub,
            prosecdef as definer,
            proconfig as config
       from pg_proc p
       left join lateral (
         select true as has from aclexplode(p.proacl) x where x.grantee = 0 and x.privilege_type = 'EXECUTE' limit 1
       ) aclexplode_public on true
      where pronamespace = 'public'::regnamespace`,
  );
  const by = (n: string) => {
    const row = privileges.find((p) => p.name === n);
    if (!row) throw new Error(`함수 없음: ${n}`);
    return row;
  };
  // anon 에게 열린 함수는 정확히 하객 RPC 뿐이다
  expect(privileges.filter((p) => p.anon).map((p) => p.name).sort()).toEqual(GUEST_RPCS);
  for (const n of GUEST_RPCS) {
    const p = by(n);
    expect([n, p.anon, p.member, p.definer, p.pub, p.config]).toEqual([n, true, true, true, false, ['search_path=""']]);
  }
  for (const n of OWNER_RPCS) {
    const p = by(n);
    expect([n, p.anon, p.member, p.definer, p.pub, p.config]).toEqual([n, false, true, true, false, ['search_path=""']]);
  }
  for (const n of INTERNAL) {
    const p = by(n);
    expect([n, p.anon, p.member, p.pub]).toEqual([n, false, false, false]);
  }

  // 표는 anon·회원 모두 직접 닿지 못한다
  for (const sql of [
    `select * from guestbook_entries`,
    `select * from rsvp_responses`,
    `select * from guest_write_rate`,
    `delete from guestbook_entries`,
    `delete from rsvp_responses`,
    `delete from guest_write_rate`,
    `update rsvp_responses set name = 'x'`,
    `insert into guest_write_rate(invitation_id, bucket, window_start, n) values ('${OTHER_ID}', 'write', now(), 0)`,
    `insert into guestbook_entries(invitation_id, name, password_hash, content) values ('${OTHER_ID}', 'x', 'x', 'x')`,
    `insert into rsvp_responses(invitation_id, name, attending, source) values ('${OTHER_ID}', 'x', true, 'guest')`,
  ]) {
    await expect(asAnon(db, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
    await expect(asMember(db, a, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
  }
  // 내부 함수는 부를 수 없다
  for (const call of [`take_guest_write('${OTHER_ID}', 'write')`, `js_trim('x')`, `clean_rsvp_input('{}', 'meetup')`]) {
    await expect(asAnon(db, () => db.query(`select ${call}`)), call).rejects.toThrow(/permission denied/);
    await expect(asMember(db, a, () => db.query(`select ${call}`)), call).rejects.toThrow(/permission denied/);
  }
}

describe('권한', () => {
  it('anon 은 하객 RPC 만 부르고 표에 닿지 못한다', async () => {
    const db = await newTestDb();
    await expectPermissions(db, await member(db));
  });

  it('Supabase 기본 권한(새 표·함수를 anon 에게 여는 설정)에서도 같다', async () => {
    const db = await newEmptyDb();
    await db.query(`create role anon; create role authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;`);
    await migrate(db, { withAuthStub: true });
    await expectPermissions(db, await member(db));
  });

  it('회원도 하객 RPC 를 부를 수 있다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const inv = await newActive(db, a);
    const r = await asMember(db, a, () => rpc<GuestView>(db, `guest_invitation($1)`, [inv.slug]));
    expect(r.state).toBe('active');
  });
});
