import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { deleteInvitation, listInvitations, mediaPurgeBacklog, setInvitationBanned } from '../invitations';
import { addAdmin, addMember, newTestDb } from '../../test/db';

const R = (c: string) => c.repeat(32);
const OTHER_ID = '11111111-1111-4111-8111-111111111111';

async function asRole<T>(db: Db, role: string, id: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id ?? '']);
  try {
    return await fn();
  } finally {
    await db.query(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const asMember = <T,>(db: Db, id: string, fn: () => Promise<T>) => asRole(db, 'authenticated', id, fn);

let seq = 0;
/** 하객 데이터 만료 계산을 정확히 시험하려고 표에 바로 넣는다. expiresIn 은 지금부터의 일수(음수면 지남) */
async function addInvitation(db: Db, owner: string, o: { expiresIn?: number | null; name?: string } = {}): Promise<string> {
  seq += 1;
  const expires = o.expiresIn == null ? null : new Date(Date.now() + o.expiresIn * 86_400_000).toISOString();
  const [r] = await db.query<{ id: string }>(
    `insert into invitations(owner_id, number, slug, theme_id, template_id, name, status, content, activated_at, expires_at)
     values ($1, $2, $3, 'wedding', 'w1', $4, 'final', '{}', case when $5::timestamptz is null then null else now() - interval '100 days' end, $5::timestamptz)
     returning id`,
    [owner, String(30000000000 + seq), `purge-slug-${seq}`, o.name ?? '우리 결혼식', expires],
  );
  return r.id;
}
async function addGuestData(db: Db, inv: string): Promise<void> {
  await db.query(`insert into guestbook_entries(invitation_id, name, password_hash, content) values ($1, '하객', 'x', '축하')`, [inv]);
  await db.query(`insert into rsvp_responses(invitation_id, name, attending, source) values ($1, '하객', true, 'guest')`, [inv]);
}
const guestCounts = async (db: Db, inv: string) => {
  const [g] = await db.query<{ n: number }>(`select count(*)::int as n from guestbook_entries where invitation_id = $1`, [inv]);
  const [r] = await db.query<{ n: number }>(`select count(*)::int as n from rsvp_responses where invitation_id = $1`, [inv]);
  return [g.n, r.n];
};
const addFile = async (db: Db, inv: string, c: string, kind = 'image') => {
  const key = `invitations/${inv}/${R(c)}.${kind === 'gif' ? 'gif' : 'webp'}`;
  await db.query(`insert into media_files(r2_key, invitation_id, kind, bytes) values ($1, $2, $3, 100)`, [key, inv, kind]);
  return key;
};
const fileRow = async (db: Db, key: string) => {
  const [r] = await db.query<{ invitation_id: string | null; in_use: boolean; delete_requested_at: Date | null; deleted_at: Date | null }>(
    `select invitation_id, in_use, delete_requested_at, deleted_at from media_files where r2_key = $1`,
    [key],
  );
  return r;
};
/** 대기열 지연(서명 주소 유효 시간)을 지난 것으로 만든다 */
const ageQueue = (db: Db) =>
  db.query(`update media_files set delete_requested_at = now() - interval '1 hour' where delete_requested_at is not null`);
const claim = (db: Db, limit = 50) =>
  db.query<{ r2_key: string; kind: string }>(`select r2_key, kind from media_purge_claim($1)`, [limit]);
const guestState = async (db: Db, slug: string) => {
  const [r] = await asRole(db, 'anon', null, () => db.query<{ r: { state: string } }>(`select guest_invitation($1) as r`, [slug]));
  return r.r.state;
};
const slugOf = async (db: Db, id: string) => {
  const [r] = await db.query<{ slug: string }>(`select slug from invitations where id = $1`, [id]);
  return r.slug;
};
const exists = async (db: Db, id: string) => {
  const [r] = await db.query<{ n: number }>(`select count(*)::int as n from invitations where id = $1`, [id]);
  return r.n === 1;
};

describe('만든 사람 삭제', () => {
  it('만든 사람 삭제: 초대장·방명록·응답이 사라지고 파일이 삭제 대기열에 들어간다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a, { expiresIn: 5 });
    const keep = await addInvitation(db, a, { expiresIn: 5 });
    await addGuestData(db, inv);
    const key = await addFile(db, inv, 'a');
    const keepKey = await addFile(db, keep, 'b');

    await asMember(db, a, () => db.query(`select remove_my_invitation($1::uuid)`, [inv]));

    expect(await exists(db, inv)).toBe(false);
    expect(await guestCounts(db, inv)).toEqual([0, 0]);
    const row = await fileRow(db, key);
    expect(row.invitation_id).toBeNull();
    expect(row.delete_requested_at).not.toBeNull();
    expect(row.in_use).toBe(false);
    expect((await fileRow(db, keepKey)).delete_requested_at).toBeNull();
  });

  it('남의 초대장을 지우려 하면 초대장도 파일도 그대로다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const b = await addMember(db, { name: '이영희' });
    const inv = await addInvitation(db, a, { expiresIn: 5 });
    const key = await addFile(db, inv, 'a');
    await asMember(db, b, () => db.query(`select remove_my_invitation($1::uuid)`, [inv]));
    expect(await exists(db, inv)).toBe(true);
    expect((await fileRow(db, key)).delete_requested_at).toBeNull();
  });
});

describe('어드민 삭제', () => {
  it('어드민 삭제: 같은 결과이고 작업 기록에 남는다. 없는 id 는 오류', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a, { expiresIn: 5, name: '철수 영희 결혼식' });
    await addGuestData(db, inv);
    const key = await addFile(db, inv, 'a');
    const key2 = await addFile(db, inv, 'b', 'gif');
    await db.query(`update invitations set banned = true where id = $1`, [inv]);
    const [{ number, activated_at, expires_at }] = await db.query<{ number: string; activated_at: Date; expires_at: Date }>(
      `select number, activated_at, expires_at from invitations where id = $1`,
      [inv],
    );

    expect(await deleteInvitation(db, adminId, inv)).toBe('ok');

    expect(await exists(db, inv)).toBe(false);
    expect(await guestCounts(db, inv)).toEqual([0, 0]);
    for (const k of [key, key2]) {
      const row = await fileRow(db, k);
      expect(row.invitation_id).toBeNull();
      expect(row.delete_requested_at).not.toBeNull();
    }
    const logs = await db.query<Record<string, unknown>>(
      `select admin_id, action, target_type, target_id, before, after, memo from admin_audit_logs`,
    );
    // 지운 초대장의 이름(개인정보일 수 있다)은 작업 기록에 남기지 않는다
    expect(logs).toEqual([
      {
        admin_id: adminId,
        action: 'invitation.delete',
        target_type: 'invitation',
        target_id: inv,
        before: {
          number,
          ownerId: a,
          themeId: 'wedding',
          status: 'final',
          activatedAt: activated_at.toISOString(),
          expiresAt: expires_at.toISOString(),
          banned: true,
          files: 2,
        },
        after: null,
        memo: null,
      },
    ]);

    // 없는 id·uuid 가 아닌 값은 오류이고 기록도 없다
    expect(await deleteInvitation(db, adminId, inv)).toBe('not_found');
    expect(await deleteInvitation(db, adminId, OTHER_ID)).toBe('not_found');
    expect(await deleteInvitation(db, adminId, 'abc')).toBe('not_found');
    expect(await db.query(`select 1 from admin_audit_logs`)).toHaveLength(1);
  });

  it('이름 확인이 틀리면 지우지 않고 기록도 없다. 사유는 기록에 남는다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a, { name: '우리 결혼식' });
    const key = await addFile(db, inv, 'a');

    expect(await deleteInvitation(db, adminId, inv, { confirmName: '우리 결혼' })).toBe('name_mismatch');
    expect(await deleteInvitation(db, adminId, inv, { confirmName: '' })).toBe('name_mismatch');
    expect(await exists(db, inv)).toBe(true);
    expect((await fileRow(db, key)).delete_requested_at).toBeNull();
    expect(await db.query(`select 1 from admin_audit_logs`)).toHaveLength(0);

    expect(await deleteInvitation(db, adminId, inv, { confirmName: '  우리 결혼식 ', memo: '신고 처리' })).toBe('ok');
    const [log] = await db.query<{ memo: string }>(`select memo from admin_audit_logs`);
    expect(log.memo).toBe('신고 처리');
  });
});

describe('어드민 숨김', () => {
  it('어드민 숨김 뒤 하객은 not_found, 해제하면 다시 열리고 파일은 그대로다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a, { expiresIn: 5 });
    const key = await addFile(db, inv, 'a');
    const slug = await slugOf(db, inv);
    expect(await guestState(db, slug)).toBe('active');

    await setInvitationBanned(db, adminId, inv, true, '신고');
    expect(await guestState(db, slug)).toBe('not_found');
    const hidden = await fileRow(db, key);
    expect(hidden.invitation_id).toBe(inv);
    expect(hidden.delete_requested_at).toBeNull();

    await setInvitationBanned(db, adminId, inv, false, '확인');
    expect(await guestState(db, slug)).toBe('active');
    const back = await fileRow(db, key);
    expect(back.invitation_id).toBe(inv);
    expect(back.delete_requested_at).toBeNull();
    expect(back.deleted_at).toBeNull();
  });
});

describe('탈퇴 확정', () => {
  it('탈퇴 확정: 그 회원 초대장 파일이 대기열에 들어간다', async () => {
    const db = await newTestDb();
    const gone = await addMember(db, { name: '떠남', status: 'withdrawing', email: 'g@x.kr' });
    const stay = await addMember(db, { name: '남음' });
    await db.query(`update profiles set withdraw_requested_at = now() - interval '31 days' where id = $1`, [gone]);
    const inv1 = await addInvitation(db, gone, { expiresIn: 5 });
    const inv2 = await addInvitation(db, gone);
    const other = await addInvitation(db, stay, { expiresIn: 5 });
    await addGuestData(db, inv1);
    const k1 = await addFile(db, inv1, 'a');
    const k2 = await addFile(db, inv2, 'b');
    const keep = await addFile(db, other, 'c');

    const [r] = await db.query<{ n: number }>(`select finalize_withdrawals() as n`);
    expect(r.n).toBe(1);

    for (const k of [k1, k2]) {
      const row = await fileRow(db, k);
      expect(row.invitation_id).toBeNull();
      expect(row.delete_requested_at).not.toBeNull();
    }
    expect((await fileRow(db, keep)).delete_requested_at).toBeNull();
    expect(await exists(db, inv1)).toBe(false);
    expect(await guestCounts(db, inv1)).toEqual([0, 0]);
    // 기존 동작 유지: 익명화와 auth 삭제
    const [p] = await db.query<{ status: string; name: string; email: string | null }>(
      `select status, name, email from profiles where id = $1`,
      [gone],
    );
    expect(p).toEqual({ status: 'withdrawn', name: '탈퇴 회원', email: null });
    expect(await db.query(`select 1 from auth.users where id = $1`, [gone])).toHaveLength(0);
  });

  it('30일이 안 된 회원의 파일은 대기열에 들어가지 않는다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '신청', status: 'withdrawing' });
    await db.query(`update profiles set withdraw_requested_at = now() - interval '29 days' where id = $1`, [a]);
    const inv = await addInvitation(db, a);
    const key = await addFile(db, inv, 'a');
    await db.query(`select finalize_withdrawals()`);
    expect((await fileRow(db, key)).delete_requested_at).toBeNull();
    expect(await exists(db, inv)).toBe(true);
  });
});

describe('purge_guest_data', () => {
  it('purge_guest_data: 만료 30일 지난 것만 지우고, 29일째와 연장한 초대장은 남긴다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const old = await addInvitation(db, a, { expiresIn: -31 });
    const day29 = await addInvitation(db, a, { expiresIn: -29 });
    const extended = await addInvitation(db, a, { expiresIn: -31 });
    const active = await addInvitation(db, a, { expiresIn: 3 });
    const draft = await addInvitation(db, a);
    for (const i of [old, day29, extended, active, draft]) await addGuestData(db, i);
    const key = await addFile(db, old, 'a');
    // 연장으로 만료일이 늦춰지면 그만큼 남는다
    await db.query(`update invitations set expires_at = now() + interval '30 days' where id = $1`, [extended]);

    const [r] = await db.query<{ n: number }>(`select purge_guest_data() as n`);
    expect(r.n).toBe(2);

    expect(await guestCounts(db, old)).toEqual([0, 0]);
    for (const i of [day29, extended, active, draft]) expect(await guestCounts(db, i)).toEqual([1, 1]);
    // 초대장과 파일은 그대로다(만료 뒤 파일 삭제는 4단계)
    expect(await exists(db, old)).toBe(true);
    const row = await fileRow(db, key);
    expect(row.invitation_id).toBe(old);
    expect(row.delete_requested_at).toBeNull();
    // 두 번 돌려도 그대로
    const [again] = await db.query<{ n: number }>(`select purge_guest_data() as n`);
    expect(again.n).toBe(0);
  });

  it('하객·회원·service_role 은 부를 수 없다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    for (const [role, id] of [['anon', null], ['authenticated', a], ['service_role', null]] as const) {
      await expect(asRole(db, role, id, () => db.query(`select purge_guest_data()`)), role).rejects.toThrow(/permission denied/);
    }
  });
});

describe('파일 삭제 대기열 함수', () => {
  it('막 들어온 파일은 서명 주소가 끝날 때까지 내주지 않고, 지난 것은 오래된 순으로 내준다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    const k1 = await addFile(db, inv, 'a');
    const k2 = await addFile(db, inv, 'b');
    await db.query(`select mark_media_removed($1::uuid)`, [inv]);
    await db.query(`delete from invitations where id = $1`, [inv]);
    expect(await claim(db)).toEqual([]);

    await db.query(`update media_files set delete_requested_at = now() - interval '2 hours' where r2_key = $1`, [k2]);
    await db.query(`update media_files set delete_requested_at = now() - interval '1 hour' where r2_key = $1`, [k1]);
    expect(await claim(db, 1)).toEqual([{ r2_key: k2, kind: 'image' }]);
    expect(await claim(db, 5)).toEqual([{ r2_key: k1, kind: 'image' }]);
  });

  it('지운 파일은 다시 나오지 않고, 실패해 남은 파일은 시간이 지나면 다시 나오며 뒤로 밀린다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    const k1 = await addFile(db, inv, 'a');
    const k2 = await addFile(db, inv, 'b');
    const k3 = await addFile(db, inv, 'c');
    await db.query(`select mark_media_removed($1::uuid)`, [inv]);
    await db.query(`delete from invitations where id = $1`, [inv]);
    await ageQueue(db);

    expect((await claim(db)).map((r) => r.r2_key).sort()).toEqual([k1, k2, k3]);
    // 같은 실행에서 바로 다시 나오면 함수가 끝나지 않는다
    expect(await claim(db)).toEqual([]);

    const [done] = await db.query<{ n: number }>(`select media_purge_done($1::text[]) as n`, [[k1]]);
    expect(done.n).toBe(1);
    expect((await fileRow(db, k1)).deleted_at).not.toBeNull();

    // k2 는 어제 실패, k3 는 그제 실패: 오래 기다린 쪽이 먼저
    await db.query(`update media_files set purge_tried_at = now() - interval '1 day' where r2_key = $1`, [k2]);
    await db.query(`update media_files set purge_tried_at = now() - interval '2 days' where r2_key = $1`, [k3]);
    expect((await claim(db, 1)).map((r) => r.r2_key)).toEqual([k3]);
    expect((await claim(db, 5)).map((r) => r.r2_key)).toEqual([k2]);
    expect((await fileRow(db, k2)).deleted_at).toBeNull();
  });

  it('대기열 표시가 있어도 초대장이 살아 있는 파일은 내주지 않는다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    const key = await addFile(db, inv, 'a');
    await db.query(`select mark_media_removed($1::uuid)`, [inv]);
    await ageQueue(db);
    expect(await claim(db)).toEqual([]);
    expect((await fileRow(db, key)).deleted_at).toBeNull();
  });

  it('이틀 넘게 남은 파일 수와 가장 오래된 시각을 알려 준다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    expect(await mediaPurgeBacklog(db)).toEqual({ stuck: 0, oldest: null });

    const old = await addFile(db, inv, 'a');
    const older = await addFile(db, inv, 'b');
    const recent = await addFile(db, inv, 'c');
    const done = await addFile(db, inv, 'd');
    await addFile(db, inv, 'e'); // 대기열에 없는 파일
    const at = async (key: string, age: string) =>
      db.query(`update media_files set delete_requested_at = now() - $1::interval where r2_key = $2`, [age, key]);
    await at(old, '3 days');
    await at(older, '5 days');
    await at(recent, '1 day');
    await at(done, '9 days');
    await db.query(`update media_files set deleted_at = now() where r2_key = $1`, [done]);

    const r = await mediaPurgeBacklog(db);
    expect(r.stuck).toBe(2);
    expect(r.oldest).toBeInstanceOf(Date);
    const days = (Date.now() - r.oldest!.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(4.9);
    expect(days).toBeLessThan(5.1);
  });

  it('media_purge_done 은 대기열에 없는 파일을 표시하지 않는다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    const key = await addFile(db, inv, 'a');
    const [r] = await db.query<{ n: number }>(`select media_purge_done($1::text[]) as n`, [[key, 'nope']]);
    expect(r.n).toBe(0);
    expect((await fileRow(db, key)).deleted_at).toBeNull();
  });

  it('초대장 없이 남은 줄(대기열 표시 없음)은 대기열로 옮겨 잃지 않는다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    const key = await addFile(db, inv, 'a');
    // 표시 없이 지워진 경우를 만든다
    await db.query(`delete from invitations where id = $1`, [inv]);
    expect((await fileRow(db, key)).delete_requested_at).toBeNull();

    expect(await claim(db)).toEqual([]); // 옮기기만 하고 지연을 지켜야 한다
    expect((await fileRow(db, key)).delete_requested_at).not.toBeNull();
    await ageQueue(db);
    expect((await claim(db)).map((r) => r.r2_key)).toEqual([key]);
  });

  it('service_role 만 부른다', async () => {
    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    for (const sql of [`select * from media_purge_claim(1)`, `select media_purge_done(array['x'])`]) {
      await expect(asRole(db, 'anon', null, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
      await expect(asRole(db, 'authenticated', a, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
    }
    await expect(asRole(db, 'service_role', null, () => claim(db))).resolves.toEqual([]);
    await asRole(db, 'service_role', null, () => db.query(`select media_purge_done(array['x'])`));
  });
});

describe('어드민 목록 찾기', () => {
  it('어드민 목록에서 번호·이름·회원 아이디로 찾는다', async () => {
    const db = await newTestDb();
    const kim = await addMember(db, { name: '김철수', loginId: 'kim_login' });
    const lee = await addMember(db, { name: '이영희', loginId: 'lee_login' });
    const invK = await addInvitation(db, kim, { name: '가을 소풍' });
    const invL = await addInvitation(db, lee, { name: '겨울 모임' });
    const [{ number }] = await db.query<{ number: string }>(`select number from invitations where id = $1`, [invL]);
    const NOW = new Date();
    const find = async (q: string) => (await listInvitations(db, { q, page: 1, now: NOW })).rows.map((r) => r.id);

    expect(await find(number)).toEqual([invL]);
    expect(await find('가을')).toEqual([invK]);
    expect(await find('kim_login')).toEqual([invK]);
    expect(await find('영희')).toEqual([invL]);
    // 회원 상세에서 복사한 회원 id 그대로도 찾는다
    expect(await find(lee)).toEqual([invL]);
    expect(await find('없는값')).toEqual([]);
  });
});

describe('설정 문서의 대기열 점검 SQL', () => {
  it('건너뛴 파일 찾기는 모양이 틀린 키만 찾는다', async () => {
    const doc = await readFile(path.resolve(process.cwd(), '..', 'docs', 'setup', 'guest-link.md'), 'utf8');
    const sql = /```sql\n(select id, kind, r2_key[\s\S]*?)```/.exec(doc)?.[1];
    expect(sql).toBeTruthy();

    const db = await newTestDb();
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a);
    await addFile(db, inv, 'a');
    const bad = `invitations/${inv}/../${R('b')}.webp`;
    await db.query(`insert into media_files(r2_key, invitation_id, kind, bytes) values ($1, $2, 'image', 100)`, [bad, inv]);
    const wrongKind = `invitations/${inv}/${R('c')}.webp`;
    await db.query(`insert into media_files(r2_key, invitation_id, kind, bytes) values ($1, $2, 'gif', 100)`, [wrongKind, inv]);
    await db.query(`select mark_media_removed($1::uuid)`, [inv]);

    const rows = await db.query<{ r2_key: string }>(sql!);
    expect(rows.map((r) => r.r2_key).sort()).toEqual([bad, wrongKind].sort());
  });
});

describe('schedule_guest_link.sql', () => {
  const file = path.resolve(process.cwd(), '..', 'supabase', 'manual', 'schedule_guest_link.sql');

  /** 운영의 cron·net·vault 를 같은 이름으로 흉내 낸다 */
  async function stubDb(secrets: Record<string, string>): Promise<Db> {
    const db = await newTestDb();
    await db.query(`
      create schema cron;
      create table cron.job(jobname text primary key, schedule text, command text);
      create function cron.schedule(n text, s text, c text) returns bigint language sql as $$
        insert into cron.job values (n, s, c) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
        select 1::bigint;
      $$;
      create schema net;
      create table net.calls(url text, headers jsonb, body jsonb, timeout_milliseconds int);
      create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$
        insert into net.calls values (url, headers, body, timeout_milliseconds);
        select 1::bigint;
      $$;
      create schema vault;
      create table vault.decrypted_secrets(name text primary key, decrypted_secret text);
    `);
    for (const [name, value] of Object.entries(secrets)) {
      await db.query(`insert into vault.decrypted_secrets values ($1, $2)`, [name, value]);
    }
    return db;
  }
  const SECRETS = { wuzu_project_url: 'https://x.supabase.co', purge_media_secret: 's3cret-value' };

  it('다시 실행해도 예약이 겹치지 않고, 서로 다른 시각이며 탈퇴 확정과 부딪히지 않는다', async () => {
    const db = await stubDb(SECRETS);
    const sql = await readFile(file, 'utf8');
    await db.query(sql);
    await db.query(sql);
    const jobs = await db.query<{ jobname: string; schedule: string }>(`select jobname, schedule from cron.job order by jobname`);
    expect(jobs.map((j) => j.jobname)).toEqual(['purge-guest-data', 'purge-media']);
    const schedules = jobs.map((j) => j.schedule);
    expect(new Set(schedules).size).toBe(2);
    for (const s of schedules) {
      expect(s).not.toBe('17 19 * * *');
      expect(s).toMatch(/^\d+ \d+ \* \* \*$/);
      const minute = Number(s.split(' ')[0]);
      expect(minute === 0 || minute === 30).toBe(false);
    }
    // 탈퇴 확정(UTC 19:17)에서 대기열에 든 파일을 같은 밤에 지우도록 그 뒤에 돈다(지연 15분 포함)
    const [minute, hour] = schedules[1].split(' ').map(Number);
    expect(hour * 60 + minute).toBeGreaterThan(19 * 60 + 17 + 15);
  });

  it('등록한 명령이 실제로 돌고, 비밀값은 파일이 아니라 Vault 에서 읽는다', async () => {
    const db = await stubDb(SECRETS);
    const sql = await readFile(file, 'utf8');
    expect(sql).not.toContain('s3cret-value');
    expect(sql).not.toMatch(/sb_secret_|eyJ[A-Za-z0-9_-]{10,}|\.supabase\.co/);
    await db.query(sql);
    const jobs = await db.query<{ jobname: string; command: string }>(`select jobname, command from cron.job`);
    const a = await addMember(db, { name: '김철수' });
    const inv = await addInvitation(db, a, { expiresIn: -31 });
    await addGuestData(db, inv);

    for (const j of jobs) await db.query(j.command);

    expect(await guestCounts(db, inv)).toEqual([0, 0]);
    const calls = await db.query<{ url: string; headers: Record<string, string>; timeout_milliseconds: number }>(
      `select url, headers, timeout_milliseconds from net.calls`,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://x.supabase.co/functions/v1/purge-media');
    expect(calls[0].headers['x-purge-secret']).toBe('s3cret-value');
    expect(calls[0].timeout_milliseconds).toBeGreaterThanOrEqual(100000);
  });

  it('Vault 값이 없으면 예약하지 않고 무엇이 없는지 알려 준다', async () => {
    const db = await stubDb({ wuzu_project_url: 'https://x.supabase.co' });
    const sql = await readFile(file, 'utf8');
    await expect(db.query(sql)).rejects.toThrow(/purge_media_secret/);
    expect(await db.query(`select 1 from cron.job`)).toHaveLength(0);
  });
});
