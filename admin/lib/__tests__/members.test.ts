import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { exportMembers, getMember, listMembers, setMemberBanned } from '../members';
import { addAdmin, addMember, newTestDb } from '../../test/db';

let seq = 0;
async function addInvitation(db: Db, ownerId: string, name = '초대장'): Promise<string> {
  seq += 1;
  const [r] = await db.query<{ id: string }>(
    `insert into invitations(owner_id, number, slug, theme_id, template_id, name, content)
     values ($1, $2, $3, 'wedding', 't1', $4, '{}') returning id`,
    [ownerId, String(10000000000 + seq), `slug-abcdef-${seq}`, name],
  );
  return r.id;
}

async function addLedger(db: Db, userId: string, total: number, title = '충전', createdAt?: string) {
  seq += 1;
  await db.query(
    `insert into ledger_entries(number, user_id, kind, title, total, created_at)
     values ($1, $2, 'charge', $3, $4, coalesce($5::timestamptz, now()))`,
    [`L${seq}`, userId, title, total, createdAt ?? null],
  );
}

async function logs(db: Db) {
  return db.query<Record<string, unknown>>(
    `select admin_id, action, target_type, target_id, before, after, memo from admin_audit_logs order by id`,
  );
}

describe('listMembers', () => {
  it('검색·상태 걸러 보기·잔액·초대장 수', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수', email: 'kim@a.com', loginId: 'kimcs', provider: 'kakao', createdAt: '2026-10-01T00:00:00Z' });
    const lee = await addMember(db, { name: '이영희', email: 'lee@b.com', loginId: 'younghee', status: 'banned', createdAt: '2026-10-02T00:00:00Z' });
    await addMember(db, { name: '박민수', email: 'park@a.com', status: 'withdrawing', provider: 'apple', createdAt: '2026-10-03T00:00:00Z' });
    await addInvitation(db, kim);
    await addInvitation(db, kim);
    await addLedger(db, kim, 100);
    await addLedger(db, kim, -30);

    const all = await listMembers(db, { q: '', page: 1 });
    expect(all.total).toBe(3);
    // 최신 가입순
    expect(all.rows.map((r) => r.name)).toEqual(['박민수', '이영희', '김철수']);
    const kimRow = all.rows.find((r) => r.id === kim)!;
    expect(kimRow).toMatchObject({ loginId: 'kimcs', email: 'kim@a.com', provider: 'kakao', status: 'active', balance: 70, invitationCount: 2 });
    expect(kimRow.createdAt).toBeInstanceOf(Date);
    expect(all.rows.find((r) => r.id === lee)).toMatchObject({ balance: 0, invitationCount: 0 });

    // 이름·이메일·아이디 검색, 대소문자 무시
    expect((await listMembers(db, { q: '영희', page: 1 })).rows.map((r) => r.id)).toEqual([lee]);
    expect((await listMembers(db, { q: 'B.COM', page: 1 })).rows.map((r) => r.id)).toEqual([lee]);
    expect((await listMembers(db, { q: 'kimcs', page: 1 })).rows.map((r) => r.id)).toEqual([kim]);
    expect((await listMembers(db, { q: '@a.com', page: 1 })).total).toBe(2);

    // 상태·가입 경로 걸러 보기, 모르는 값은 무시
    expect((await listMembers(db, { q: '', status: 'banned', page: 1 })).rows.map((r) => r.id)).toEqual([lee]);
    expect((await listMembers(db, { q: '', provider: 'kakao', page: 1 })).rows.map((r) => r.id)).toEqual([kim]);
    expect((await listMembers(db, { q: '@a.com', status: 'active', page: 1 })).rows.map((r) => r.id)).toEqual([kim]);
    expect((await listMembers(db, { q: '', status: 'nope', provider: "x' or 1=1", page: 1 })).total).toBe(3);
  });

  it('20개씩 페이지, 이상한 page 는 1', async () => {
    const db = await newTestDb();
    for (let i = 0; i < 23; i++) {
      await addMember(db, { name: `회원${i}`, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() });
    }
    const p1 = await listMembers(db, { q: '', page: 1 });
    expect(p1.total).toBe(23);
    expect(p1.rows).toHaveLength(20);
    expect(p1.rows[0].name).toBe('회원22');
    const p2 = await listMembers(db, { q: '', page: 2 });
    expect(p2.rows.map((r) => r.name)).toEqual(['회원2', '회원1', '회원0']);
    for (const page of [Number.NaN, Number.POSITIVE_INFINITY, -3, 1e20]) {
      expect((await listMembers(db, { q: '', page })).rows[0].name).toBe('회원22');
    }
  });

  it('exportMembers 는 같은 걸러 보기로 페이지 없이', async () => {
    const db = await newTestDb();
    for (let i = 0; i < 25; i++) await addMember(db, { name: `회원${i}`, status: i % 5 === 0 ? 'banned' : 'active' });
    expect(await exportMembers(db, { q: '' })).toHaveLength(25);
    expect(await exportMembers(db, { q: '', status: 'banned' })).toHaveLength(5);
  });
});

describe('getMember', () => {
  it('정보·초대장·잔액·최근 원장 20줄', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수', email: 'kim@a.com', provider: 'google' });
    await addInvitation(db, kim, '우리 결혼해요');
    for (let i = 0; i < 22; i++) {
      await addLedger(db, kim, 10, `충전${i}`, new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString());
    }
    const m = await getMember(db, kim);
    expect(m).not.toBeNull();
    expect(m!).toMatchObject({ id: kim, name: '김철수', email: 'kim@a.com', provider: 'google', status: 'active', balance: 220 });
    expect(m!.invitations.map((i) => i.name)).toEqual(['우리 결혼해요']);
    expect(m!.invitationCount).toBe(1);
    expect(m!.ledger).toHaveLength(20);
    expect(m!.ledger[0]).toMatchObject({ title: '충전21', kind: 'charge', total: 10 });

    expect(await getMember(db, '00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(await getMember(db, 'not-a-uuid')).toBeNull();
  });
});

describe('setMemberBanned', () => {
  it('정지·해제 작업 기록에 before/after status', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const kim = await addMember(db, { name: '김철수' });

    expect(await setMemberBanned(db, adminId, kim, true, '도배')).toBe('ok');
    expect((await getMember(db, kim))!.status).toBe('banned');
    expect(await setMemberBanned(db, adminId, kim, false, '소명 확인')).toBe('ok');
    expect((await getMember(db, kim))!.status).toBe('active');

    expect(await logs(db)).toEqual([
      { admin_id: adminId, action: 'member.ban', target_type: 'member', target_id: kim, before: { status: 'active' }, after: { status: 'banned' }, memo: '도배' },
      { admin_id: adminId, action: 'member.unban', target_type: 'member', target_id: kim, before: { status: 'banned' }, after: { status: 'active' }, memo: '소명 확인' },
    ]);
  });

  it('정지 후 다시 정지하면 기록은 한 줄', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const kim = await addMember(db, { name: '김철수' });
    expect(await setMemberBanned(db, adminId, kim, true, '1')).toBe('ok');
    expect(await setMemberBanned(db, adminId, kim, true, '2')).toBe('ok');
    expect(await logs(db)).toHaveLength(1);
    // 정상 회원 해제도 기록 없음
    const lee = await addMember(db, { name: '이영희' });
    expect(await setMemberBanned(db, adminId, lee, false, '3')).toBe('ok');
    expect(await logs(db)).toHaveLength(1);
  });

  it('탈퇴 진행 중 회원은 withdrawing', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const park = await addMember(db, { name: '박민수', status: 'withdrawing' });
    expect(await setMemberBanned(db, adminId, park, true, '도배')).toBe('withdrawing');
    expect(await setMemberBanned(db, adminId, park, false, '도배')).toBe('withdrawing');
    expect((await getMember(db, park))!.status).toBe('withdrawing');
    expect(await logs(db)).toHaveLength(0);
  });

  it('탈퇴 완료 회원은 withdrawn, 목록에서 상태로 걸러 보기', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const gone = await addMember(db, { name: '탈퇴 회원', status: 'withdrawn' });
    await addMember(db, { name: '김철수' });
    const list = await listMembers(db, { q: '', status: 'withdrawn', page: 1 });
    expect(list.rows.map((r) => r.id)).toEqual([gone]);
    expect(list.rows[0].status).toBe('withdrawn');
    expect(await setMemberBanned(db, adminId, gone, true, '도배')).toBe('withdrawn');
    expect((await getMember(db, gone))!.status).toBe('withdrawn');
    expect(await logs(db)).toHaveLength(0);
  });

  it('없는 회원은 not_found', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    expect(await setMemberBanned(db, adminId, '00000000-0000-0000-0000-000000000000', true, 'x')).toBe('not_found');
    expect(await setMemberBanned(db, adminId, 'abc', true, 'x')).toBe('not_found');
    expect(await logs(db)).toHaveLength(0);
  });
});
