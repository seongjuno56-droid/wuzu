import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { addMember, newTestDb } from '../../test/db';

const sample = (over: Record<string, unknown> = {}) => ({
  themeId: 'meetup',
  templateId: 'm1',
  name: '모임',
  content: { theme: 'meetup', gallery: { photos: [] } },
  design: {},
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

const member = (db: Db, name = '회원') => addMember(db, { name });
const newInv = async (db: Db, owner: string, data = sample()) => {
  const [r] = await asMember(db, owner, () =>
    db.query<{ r: { id: string } }>(`select save_my_invitation(null, $1::jsonb) as r`, [JSON.stringify(data)]),
  );
  return r.r.id;
};
const saveInv = (db: Db, owner: string, id: string, data: Record<string, unknown>) =>
  asMember(db, owner, () => db.query(`select save_my_invitation($1::uuid, $2::jsonb)`, [id, JSON.stringify(data)]));
const record = (db: Db, who: string, id: string, key: string, kind = 'image', bytes = 1000) =>
  asMember(db, who, () => db.query(`select record_media_file($1::uuid, $2, $3, $4)`, [id, key, kind, bytes]));
const files = (db: Db) =>
  db.query<{ r2_key: string; invitation_id: string | null; kind: string; bytes: string; in_use: boolean; delete_requested_at: string | null }>(
    `select r2_key, invitation_id, kind, bytes, in_use, delete_requested_at from media_files order by r2_key`,
  );

describe('media_files', () => {
  it('자기 초대장 파일을 기록한다. 처음에는 쓰임 표시가 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await record(db, a, id, `invitations/${id}/a.webp`);
    const [f] = await files(db);
    expect(f).toMatchObject({ r2_key: `invitations/${id}/a.webp`, invitation_id: id, kind: 'image', in_use: false });
    expect(Number(f.bytes)).toBe(1000);
  });

  it('남의 초대장 파일은 media_files 에 기록할 수 없다', async () => {
    const db = await newTestDb();
    const a = await member(db, 'A');
    const b = await member(db, 'B');
    const id = await newInv(db, a);
    await expect(record(db, b, id, `invitations/${id}/x.webp`)).rejects.toThrow('NOT_FOUND');
    expect(await files(db)).toEqual([]);
  });

  it('키가 그 초대장 폴더가 아니면 거부한다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await expect(record(db, a, id, `invitations/other/x.webp`)).rejects.toThrow('INVALID');
  });

  it('정지 회원은 기록할 수 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await db.query(`update profiles set status = 'banned' where id = $1`, [a]);
    await expect(record(db, a, id, `invitations/${id}/x.webp`)).rejects.toThrow('account_unavailable');
  });

  it('틀린 종류·크기는 표가 거부한다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await expect(record(db, a, id, `invitations/${id}/x.exe`, 'exe')).rejects.toThrow();
    await expect(record(db, a, id, `invitations/${id}/x.webp`, 'image', 0)).rejects.toThrow();
  });

  it('같은 키를 다시 기록해도(올리기 재시도) 한 줄이다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await record(db, a, id, `invitations/${id}/t_thumb.webp`, 'thumb', 10);
    await record(db, a, id, `invitations/${id}/t_thumb.webp`, 'thumb', 20);
    const rows = await files(db);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].bytes)).toBe(20);
  });

  it('초대장 하나에 파일을 끝없이 기록할 수 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await db.query(
      `insert into media_files(r2_key, invitation_id, kind, bytes)
       select 'invitations/' || $1::text || '/' || g || '.webp', $1::uuid, 'image', 1 from generate_series(1, 500) g`,
      [id],
    );
    await expect(record(db, a, id, `invitations/${id}/more.webp`)).rejects.toThrow('TOO_MANY');
  });

  it('저장한 내용에 들어 있는 파일과 그 작은 사진만 쓰임 표시가 되고, 빠지면 표시만 풀린다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    const k = (n: string) => `invitations/${id}/${n}`;
    await record(db, a, id, k('main.webp'));
    await record(db, a, id, k('main_thumb.webp'), 'thumb');
    await record(db, a, id, k('canvas.gif'), 'gif');
    await record(db, a, id, k('link.jpg'), 'linkThumb');
    await record(db, a, id, k('never.webp'));

    await saveInv(
      db,
      a,
      id,
      sample({
        content: { theme: 'meetup', gallery: { photos: [`r2://${k('main.webp')}`] } },
        design: { cover: { mode: 'canvas', canvas: { elements: [{ kind: 'gif', uri: `r2://${k('canvas.gif')}` }] } } },
        linkThumb: `r2://${k('link.jpg')}`,
      }),
    );
    const on = (await files(db)).filter((f) => f.in_use).map((f) => f.r2_key);
    expect(on).toEqual([k('canvas.gif'), k('link.jpg'), k('main.webp'), k('main_thumb.webp')]);

    await saveInv(db, a, id, sample());
    const rows = await files(db);
    expect(rows.filter((f) => f.in_use)).toEqual([]);
    // 교체는 표시만: 삭제 대기열에 넣지 않는다
    expect(rows.filter((f) => f.delete_requested_at)).toEqual([]);
  });

  it('mark_media_removed 는 그 초대장 파일만 삭제 대기열에 넣는다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    const other = await newInv(db, a);
    await record(db, a, id, `invitations/${id}/a.webp`);
    await record(db, a, other, `invitations/${other}/b.webp`);
    await db.query(`select mark_media_removed($1::uuid)`, [id]);
    const rows = await files(db);
    const of = (n: string) => rows.find((r) => r.invitation_id === n)!;
    expect(of(id).delete_requested_at).not.toBeNull();
    expect(of(id).in_use).toBe(false);
    expect(of(other).delete_requested_at).toBeNull();
  });

  it('초대장이 지워져도 파일 기록은 남는다(지우는 일을 놓치지 않게)', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    await record(db, a, id, `invitations/${id}/a.webp`);
    await asMember(db, a, () => db.query(`select remove_my_invitation($1::uuid)`, [id]));
    const rows = await files(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].invitation_id).toBeNull();
  });

  it('회원·하객은 표와 내부 함수에 직접 닿지 못하고, 기록 함수는 하객이 부를 수 없다', async () => {
    const db = await newTestDb();
    const a = await member(db);
    const id = await newInv(db, a);
    for (const sql of [`select * from media_files`, `delete from media_files`, `select mark_media_removed('${id}')`]) {
      await expect(asMember(db, a, () => db.query(sql)), sql).rejects.toThrow(/permission denied/);
    }
    await db.query(`set role anon`);
    try {
      await expect(db.query(`select * from media_files`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select record_media_file('${id}', 'k', 'image', 1)`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.query(`reset role`);
    }
  });
});
