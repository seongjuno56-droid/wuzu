import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import {
  exportInvitations,
  getInvitationOwnerName,
  invitationState,
  listInvitations,
  setInvitationBanned,
} from '../invitations';
import { addAdmin, addMember, newTestDb } from '../../test/db';

const NOW = new Date('2026-10-27T03:00:00Z');

let seq = 0;
async function addInvitation(
  db: Db,
  ownerId: string,
  i: {
    name?: string;
    number?: string;
    themeId?: 'wedding' | 'dol' | 'corporate' | 'meetup';
    activatedAt?: string | null;
    expiresAt?: string | null;
    banned?: boolean;
    createdAt?: string;
  } = {},
): Promise<string> {
  seq += 1;
  const [r] = await db.query<{ id: string }>(
    `insert into invitations(owner_id, number, slug, theme_id, template_id, name, content,
                             activated_at, expires_at, banned, created_at)
     values ($1, $2, $3, $4, 't1', $5, '{}', $6, $7, $8, coalesce($9::timestamptz, now())) returning id`,
    [
      ownerId,
      i.number ?? String(20000000000 + seq),
      `slug-inv-test-${seq}`,
      i.themeId ?? 'wedding',
      i.name ?? '초대장',
      i.activatedAt ?? null,
      i.expiresAt ?? null,
      i.banned ?? false,
      i.createdAt ?? null,
    ],
  );
  return r.id;
}

async function logs(db: Db) {
  return db.query<Record<string, unknown>>(
    `select admin_id, action, target_type, target_id, before, after, memo from admin_audit_logs order by id`,
  );
}

describe('invitationState', () => {
  it('상태 계산: 활성화 전·기간 안·만료', () => {
    const at = new Date('2026-10-01T00:00:00Z');
    expect(invitationState({ activatedAt: null, expiresAt: null }, NOW)).toBe('draft');
    // 활성화 전이면 만료일이 있어도 작성 중
    expect(invitationState({ activatedAt: null, expiresAt: new Date('2026-01-01T00:00:00Z') }, NOW)).toBe('draft');
    expect(invitationState({ activatedAt: at, expiresAt: new Date(NOW.getTime() + 1) }, NOW)).toBe('active');
    // 경계: expires_at == now 는 만료
    expect(invitationState({ activatedAt: at, expiresAt: new Date(NOW.getTime()) }, NOW)).toBe('expired');
    expect(invitationState({ activatedAt: at, expiresAt: new Date(NOW.getTime() - 1) }, NOW)).toBe('expired');
    expect(invitationState({ activatedAt: at, expiresAt: null }, NOW)).toBe('expired');
  });
});

describe('listInvitations', () => {
  it('테마·상태·숨김 걸러 보기, 초대장No 검색', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수' });
    const lee = await addMember(db, { name: '이영희' });
    const draft = await addInvitation(db, kim, { name: '우리 결혼해요', number: '11111111111', createdAt: '2026-10-01T00:00:00Z' });
    const active = await addInvitation(db, kim, {
      name: '첫 돌잔치',
      themeId: 'dol',
      number: '22222222222',
      activatedAt: '2026-10-02T00:00:00Z',
      expiresAt: '2026-11-02T00:00:00Z',
      createdAt: '2026-10-02T00:00:00Z',
    });
    const expired = await addInvitation(db, lee, {
      name: '송년 모임',
      themeId: 'meetup',
      number: '33333333333',
      activatedAt: '2026-09-01T00:00:00Z',
      expiresAt: NOW.toISOString(),
      banned: true,
      createdAt: '2026-10-03T00:00:00Z',
    });

    const all = await listInvitations(db, { q: '', page: 1, now: NOW });
    expect(all.total).toBe(3);
    // 최신순
    expect(all.rows.map((r) => r.id)).toEqual([expired, active, draft]);
    expect(all.rows[0]).toMatchObject({
      number: '33333333333',
      name: '송년 모임',
      themeId: 'meetup',
      ownerId: lee,
      ownerName: '이영희',
      state: 'expired',
      banned: true,
    });
    expect(all.rows[0].activatedAt).toBeInstanceOf(Date);
    expect(all.rows[0].createdAt).toBeInstanceOf(Date);
    expect(all.rows.find((r) => r.id === active)!.state).toBe('active');
    expect(all.rows.find((r) => r.id === draft)!.state).toBe('draft');

    // 검색: 초대장No·이름·만든 사람 이름
    expect((await listInvitations(db, { q: '22222', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([active]);
    expect((await listInvitations(db, { q: '결혼', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([draft]);
    expect((await listInvitations(db, { q: '영희', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([expired]);
    expect((await listInvitations(db, { q: '%', page: 1, now: NOW })).total).toBe(0);

    // 테마·상태·숨김·만든 사람
    expect((await listInvitations(db, { q: '', theme: 'dol', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([active]);
    expect((await listInvitations(db, { q: '', state: 'draft', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([draft]);
    expect((await listInvitations(db, { q: '', state: 'active', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([active]);
    expect((await listInvitations(db, { q: '', state: 'expired', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([expired]);
    expect((await listInvitations(db, { q: '', banned: 'true', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([expired]);
    expect((await listInvitations(db, { q: '', banned: 'false', page: 1, now: NOW })).total).toBe(2);
    expect((await listInvitations(db, { q: '', owner: kim, page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([active, draft]);
    expect((await listInvitations(db, { q: '', owner: kim, theme: 'wedding', page: 1, now: NOW })).rows.map((r) => r.id)).toEqual([draft]);

    // 모르는 값은 무시
    expect(
      (await listInvitations(db, { q: '', theme: 'x', state: 'y', banned: 'z', owner: "1' or 1=1", page: 1, now: NOW })).total,
    ).toBe(3);

    // now 가 바뀌면 상태도 바뀐다
    const later = new Date('2026-12-01T00:00:00Z');
    expect((await listInvitations(db, { q: '', state: 'active', page: 1, now: later })).total).toBe(0);

    // CSV 는 같은 걸러 보기로
    expect((await exportInvitations(db, { q: '', owner: kim, now: NOW })).map((r) => r.id)).toEqual([active, draft]);
  });

  it('20개씩 페이지', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수' });
    for (let i = 0; i < 23; i++) {
      await addInvitation(db, kim, { name: `초대장${i}`, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() });
    }
    const p1 = await listInvitations(db, { q: '', page: 1, now: NOW });
    expect(p1.total).toBe(23);
    expect(p1.rows).toHaveLength(20);
    expect(p1.rows[0].name).toBe('초대장22');
    const p2 = await listInvitations(db, { q: '', page: 2, now: NOW });
    expect(p2.rows.map((r) => r.name)).toEqual(['초대장2', '초대장1', '초대장0']);
  });
});

describe('getInvitationOwnerName', () => {
  it('회원 이름, 없거나 uuid 가 아니면 null', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수' });
    expect(await getInvitationOwnerName(db, kim)).toBe('김철수');
    expect(await getInvitationOwnerName(db, '00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(await getInvitationOwnerName(db, 'abc')).toBeNull();
  });
});

describe('setInvitationBanned', () => {
  it('숨긴 초대장 다시 숨기면 기록 없음, 해제는 기록', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const kim = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, kim);

    expect(await setInvitationBanned(db, adminId, inv, true, '부적절한 사진')).toBe('ok');
    expect(await setInvitationBanned(db, adminId, inv, true, '또')).toBe('ok');
    expect((await listInvitations(db, { q: '', page: 1, now: NOW })).rows[0].banned).toBe(true);
    expect(await setInvitationBanned(db, adminId, inv, false, '수정 확인')).toBe('ok');
    expect((await listInvitations(db, { q: '', page: 1, now: NOW })).rows[0].banned).toBe(false);
    // 숨기지 않은 초대장 해제도 기록 없음
    expect(await setInvitationBanned(db, adminId, inv, false, '다시')).toBe('ok');

    expect(await logs(db)).toEqual([
      { admin_id: adminId, action: 'invitation.hide', target_type: 'invitation', target_id: inv, before: { banned: false }, after: { banned: true }, memo: '부적절한 사진' },
      { admin_id: adminId, action: 'invitation.unhide', target_type: 'invitation', target_id: inv, before: { banned: true }, after: { banned: false }, memo: '수정 확인' },
    ]);
  });

  it('없는 초대장은 not_found', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    expect(await setInvitationBanned(db, adminId, '00000000-0000-0000-0000-000000000000', true, 'x')).toBe('not_found');
    expect(await setInvitationBanned(db, adminId, 'abc', true, 'x')).toBe('not_found');
    expect(await logs(db)).toHaveLength(0);
  });
});
