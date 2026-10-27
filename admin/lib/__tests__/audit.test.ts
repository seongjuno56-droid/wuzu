import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { listAuditLogs, withAudit } from '../audit';
import { newTestDb } from '../../test/db';

/** 운영자 한 명을 만들고 id 를 돌려준다 */
async function addAdmin(db: Db, email: string, name: string): Promise<string> {
  const [a] = await db.query<{ id: string }>(
    `insert into admins(email, name, password_hash) values ($1, $2, 'x') returning id`,
    [email, name],
  );
  return a.id;
}

/** 바뀐 것을 흉내 낼 작은 표 */
async function addMemoTable(db: Db) {
  await db.query(`create table t_memo (id int primary key, v text)`);
  await db.query(`insert into t_memo values (1, 'old')`);
}

async function countLogs(db: Db): Promise<number> {
  const [r] = await db.query<{ n: number }>(`select count(*)::int as n from admin_audit_logs`);
  return r.n;
}

describe('withAudit', () => {
  it('바뀐 것과 기록이 함께 남는다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '운영자');
    await addMemoTable(db);

    const result = await withAudit(
      db,
      { adminId, action: 'member.ban', targetType: 'member', targetId: 'm1', memo: '도배' },
      async (tx) => {
        await tx.query(`update t_memo set v = 'new' where id = 1`);
        return { before: { v: 'old' }, after: { v: 'new' }, changed: true, result: 'ok' };
      },
    );

    expect(result).toBe('ok');
    const [row] = await db.query<{ v: string }>(`select v from t_memo where id = 1`);
    expect(row.v).toBe('new');
    const logs = await db.query<Record<string, unknown>>(
      `select admin_id, action, target_type, target_id, before, after, memo from admin_audit_logs`,
    );
    expect(logs).toEqual([
      {
        admin_id: adminId,
        action: 'member.ban',
        target_type: 'member',
        target_id: 'm1',
        before: { v: 'old' },
        after: { v: 'new' },
        memo: '도배',
      },
    ]);
  });

  it('change 가 던지면 바뀐 것도 기록도 없다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '운영자');
    await addMemoTable(db);

    await expect(
      withAudit(db, { adminId, action: 'member.ban', targetType: 'member', targetId: 'm1' }, async (tx) => {
        await tx.query(`update t_memo set v = 'new' where id = 1`);
        throw new Error('실패');
      }),
    ).rejects.toThrow('실패');

    const [row] = await db.query<{ v: string }>(`select v from t_memo where id = 1`);
    expect(row.v).toBe('old');
    expect(await countLogs(db)).toBe(0);
  });

  it('기록 insert 가 실패하면 바뀐 것도 되돌린다', async () => {
    const db = await newTestDb();
    await addMemoTable(db);

    // 없는 운영자 id → 외래 키 위반으로 기록 insert 가 실패한다
    await expect(
      withAudit(
        db,
        {
          adminId: '00000000-0000-0000-0000-000000000000',
          action: 'member.ban',
          targetType: 'member',
          targetId: 'm1',
        },
        async (tx) => {
          await tx.query(`update t_memo set v = 'new' where id = 1`);
          return { before: null, after: null, changed: true, result: undefined };
        },
      ),
    ).rejects.toThrow();

    const [row] = await db.query<{ v: string }>(`select v from t_memo where id = 1`);
    expect(row.v).toBe('old');
  });

  it('changed:false 면 기록하지 않는다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '운영자');

    const result = await withAudit(
      db,
      { adminId, action: 'member.unban', targetType: 'member', targetId: 'm1' },
      async () => ({ before: { s: 'active' }, after: { s: 'active' }, changed: false, result: 7 }),
    );

    expect(result).toBe(7);
    expect(await countLogs(db)).toBe(0);
  });
});

describe('listAuditLogs', () => {
  it('listAuditLogs 걸러 보기·최신순·20개씩', async () => {
    const db = await newTestDb();
    const kim = await addAdmin(db, 'kim@wuzu.kr', '김운영');
    const lee = await addAdmin(db, 'lee@wuzu.kr', '이운영');

    // 김운영 25건: 2026-10-01 00:00 부터 1시간 간격, target_id 는 0..24
    for (let i = 0; i < 25; i++) {
      await db.query(
        `insert into admin_audit_logs(admin_id, action, target_type, target_id, created_at)
         values ($1, 'member.ban', 'member', $2, timestamptz '2026-10-01 00:00:00+00' + make_interval(hours => $3))`,
        [kim, String(i), i],
      );
    }
    // 이운영 1건: 다른 동작·대상·날짜
    await db.query(
      `insert into admin_audit_logs(admin_id, action, target_type, target_id, created_at)
       values ($1, 'invitation.hide', 'invitation', 'inv1', '2026-10-05 12:00:00+00')`,
      [lee],
    );

    const p1 = await listAuditLogs(db, { adminId: kim, page: 1 });
    expect(p1.total).toBe(25);
    expect(p1.rows).toHaveLength(20);
    expect(p1.rows.map((r) => r.targetId)).toEqual(
      Array.from({ length: 20 }, (_, k) => String(24 - k)),
    );
    expect(p1.rows[0]).toMatchObject({
      adminId: kim,
      adminName: '김운영',
      action: 'member.ban',
      targetType: 'member',
      targetId: '24',
    });

    const p2 = await listAuditLogs(db, { adminId: kim, page: 2 });
    expect(p2.total).toBe(25);
    expect(p2.rows.map((r) => r.targetId)).toEqual(['4', '3', '2', '1', '0']);

    // 걸러 보기 없음: 전체 26건, 맨 앞은 가장 늦은 이운영 기록
    const all = await listAuditLogs(db, { page: 1 });
    expect(all.total).toBe(26);
    expect(all.rows[0]).toMatchObject({ adminName: '이운영', targetId: 'inv1' });

    const byAction = await listAuditLogs(db, { action: 'invitation.hide', page: 1 });
    expect(byAction.total).toBe(1);
    expect(byAction.rows[0].adminName).toBe('이운영');

    const byType = await listAuditLogs(db, { targetType: 'member', page: 1 });
    expect(byType.total).toBe(25);

    // 날짜 범위(한국 시간): KST 10-01 하루 = UTC 09-30 15:00 ~ 10-01 15:00 → 0..14시 15건
    const byDate = await listAuditLogs(db, { from: '2026-10-01', to: '2026-10-01', page: 1 });
    expect(byDate.total).toBe(15);
    // KST 10-02 0시 = UTC 10-01 15:00 부터 → 15..24시 10건 + 이운영 1건
    const fromOnly = await listAuditLogs(db, { from: '2026-10-02', page: 1 });
    expect(fromOnly.total).toBe(11);
    expect(fromOnly.rows.map((r) => r.targetId).slice(0, 3)).toEqual(['inv1', '24', '23']);
  });

  it('잘못된 adminId·from·to 를 줘도 오류 없이 그 걸러 보기만 빠진다', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '운영자');
    await db.query(
      `insert into admin_audit_logs(admin_id, action, target_type, target_id, created_at)
       values ($1, 'member.ban', 'member', 'm1', '2026-10-05 03:00:00+00'),
              ($1, 'invitation.hide', 'invitation', 'i1', '2026-10-06 03:00:00+00')`,
      [adminId],
    );

    for (const bad of [
      { adminId: 'abc' },
      { from: '2026-13-40' },
      { to: '어제' },
      { from: '2026-02-30', to: '2026-1-5' },
    ]) {
      const res = await listAuditLogs(db, { ...bad, page: 1 });
      expect(res.total, JSON.stringify(bad)).toBe(2);
    }
    // 잘못된 값은 빠지고 올바른 걸러 보기는 그대로 적용된다
    const mixed = await listAuditLogs(db, { adminId: 'abc', action: 'member.ban', to: '어제', page: 1 });
    expect(mixed.rows.map((r) => r.targetId)).toEqual(['m1']);
    // page 가 NaN·Infinity 면 1페이지
    for (const page of [Number.NaN, Number.POSITIVE_INFINITY, -3]) {
      expect((await listAuditLogs(db, { page })).rows, String(page)).toHaveLength(2);
    }
  });

  it('날짜 걸러 보기는 세션 시간대와 상관없이 한국 시간 하루 기준', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '운영자');
    await db.query(`set time zone 'UTC'`);
    // UTC 2026-10-27 15:30 = KST 2026-10-28 00:30
    await db.query(
      `insert into admin_audit_logs(admin_id, action, target_type, target_id, created_at)
       values ($1, 'member.ban', 'member', 'm1', '2026-10-27 15:30:00+00')`,
      [adminId],
    );

    for (const tz of ['UTC', 'America/New_York']) {
      await db.query(`set time zone '${tz}'`);
      const on28 = await listAuditLogs(db, { from: '2026-10-28', to: '2026-10-28', page: 1 });
      expect(on28.total, tz).toBe(1);
      const on27 = await listAuditLogs(db, { from: '2026-10-27', to: '2026-10-27', page: 1 });
      expect(on27.total, tz).toBe(0);
    }
  });
});
