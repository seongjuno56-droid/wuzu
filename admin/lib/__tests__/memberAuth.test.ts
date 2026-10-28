import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { newTestDb } from '../../test/db';

type Profile = {
  id: string;
  name: string;
  email: string | null;
  login_id: string | null;
  provider: string;
  status: string;
  birth: string | null;
  gender: string | null;
  marketing_agreed: boolean;
  withdraw_requested_at: string | null;
  profile_updated_at: string | null;
  marketing_updated_at: string | null;
};

/** 소셜 로그인으로 가입한 것처럼 auth.users 에 행을 넣는다(트리거가 profiles 를 만든다) */
async function signUp(
  db: Db,
  provider: string,
  meta: Record<string, unknown> = {},
  email: string | null = 'm@example.com',
): Promise<string> {
  const [u] = await db.query<{ id: string }>(
    `insert into auth.users(email, raw_app_meta_data, raw_user_meta_data)
     values ($1, $2::jsonb, $3::jsonb) returning id`,
    [email, JSON.stringify({ provider }), JSON.stringify(meta)],
  );
  return u.id;
}

async function profileOf(db: Db, id: string): Promise<Profile | undefined> {
  const [p] = await db.query<Profile>(`select * from profiles where id = $1`, [id]);
  return p;
}

/** 회원(authenticated) 권한으로 fn 을 실행한다. PGlite 는 연결 하나라 set role 이 이어진다 */
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

describe('회원 가입 트리거', () => {
  it('카카오 가입이면 profiles 행이 생기고 이름·login_id 가 채워진다', async () => {
    const db = await newTestDb();
    const id = await signUp(db, 'kakao', { full_name: '홍길동' });
    const p = await profileOf(db, id);
    expect(p?.name).toBe('홍길동');
    expect(p?.provider).toBe('kakao');
    expect(p?.email).toBe('m@example.com');
    expect(p?.status).toBe('active');
    expect(p?.login_id).toMatch(/^ka_[a-z0-9]{8}$/);
  });

  it('구글은 go_ 로 시작하고, 이름 메타가 없으면 "회원"', async () => {
    const db = await newTestDb();
    const id = await signUp(db, 'google');
    const p = await profileOf(db, id);
    expect(p?.name).toBe('회원');
    expect(p?.login_id).toMatch(/^go_[a-z0-9]{8}$/);
  });

  it('이름 메타는 full_name → name → nickname 순이고 30자로 자른다', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao', { nickname: '닉네임' });
    expect((await profileOf(db, a))?.name).toBe('닉네임');
    const b = await signUp(db, 'kakao', { name: '이름', nickname: '닉' });
    expect((await profileOf(db, b))?.name).toBe('이름');
    const c = await signUp(db, 'google', { full_name: 'x'.repeat(40) });
    expect((await profileOf(db, c))?.name).toBe('x'.repeat(30));
  });

  it('provider 메타가 없으면 profiles 를 만들지 않는다(어드민 시드·기존 테스트용)', async () => {
    const db = await newTestDb();
    const [u] = await db.query<{ id: string }>(`insert into auth.users(email) values ('a@b.c') returning id`);
    expect(await profileOf(db, u.id)).toBeUndefined();
  });

  it('허용하지 않는 provider 면 가입이 실패한다', async () => {
    const db = await newTestDb();
    await expect(signUp(db, 'naver')).rejects.toThrow();
  });
});

describe('profiles RLS', () => {
  it('회원은 자기 행만 보이고 anon 은 못 본다', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao', { full_name: 'A' });
    await signUp(db, 'google', { full_name: 'B' });

    const rows = await asMember(db, a, () => db.query<Profile>(`select * from profiles`));
    expect(rows.map((r) => r.id)).toEqual([a]);

    // anon 은 select 권한이 없어 오류가 나거나 0행이어야 한다
    const anonRows = await asAnon(db, () => db.query(`select * from profiles`)).catch(() => []);
    expect(anonRows).toEqual([]);
  });

  it('회원이 profiles 를 직접 고치면 권한 오류', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    await expect(asMember(db, a, () => db.query(`update profiles set status = 'active'`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('내 정보 RPC', () => {
  it('my_profile 은 내 행을, 행이 없으면 null 을 돌려준다', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao', { full_name: 'A' });
    const [r] = await asMember(db, a, () => db.query<{ id: string; name: string }>(`select * from my_profile()`));
    expect(r.id).toBe(a);
    expect(r.name).toBe('A');

    const [n] = await asMember(db, '00000000-0000-0000-0000-000000000000', () =>
      db.query<{ p: unknown }>(`select my_profile() is null as p`),
    );
    expect(n.p).toBe(true);
  });

  it('update_my_account 는 이름 앞뒤 공백을 지우고, 31자면 거절', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    const [r] = await asMember(db, a, () =>
      db.query<Profile>(`select * from update_my_account('  새이름 ', '1990-01-02', 'female')`),
    );
    expect(r.name).toBe('새이름');
    expect(r.gender).toBe('female');
    expect(r.profile_updated_at).not.toBeNull();

    await expect(
      asMember(db, a, () => db.query(`select update_my_account($1, null, null)`, ['가'.repeat(31)])),
    ).rejects.toThrow();
    await expect(asMember(db, a, () => db.query(`select update_my_account('   ', null, null)`))).rejects.toThrow();
  });

  it('update_my_profile 은 마케팅이 바뀔 때만 marketing_updated_at 을 갱신', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'google');
    const [r1] = await asMember(db, a, () =>
      db.query<Profile>(`select * from update_my_profile('1990-01-02', 'male', false)`),
    );
    expect(r1.gender).toBe('male');
    expect(r1.profile_updated_at).not.toBeNull();
    expect(r1.marketing_updated_at).toBeNull();

    const [r2] = await asMember(db, a, () => db.query<Profile>(`select * from update_my_profile(null, null, true)`));
    expect(r2.marketing_agreed).toBe(true);
    expect(r2.marketing_updated_at).not.toBeNull();
  });

  it('set_my_marketing 은 동의 여부와 시각을 바꾼다', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'google');
    const [r] = await asMember(db, a, () => db.query<Profile>(`select * from set_my_marketing(true)`));
    expect(r.marketing_agreed).toBe(true);
    expect(r.marketing_updated_at).not.toBeNull();
  });

  it('request_withdraw → withdrawing, cancel_withdraw → active', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    await asMember(db, a, () => db.query(`select request_withdraw()`));
    let p = await profileOf(db, a);
    expect(p?.status).toBe('withdrawing');
    expect(p?.withdraw_requested_at).not.toBeNull();

    const [r] = await asMember(db, a, () => db.query<Profile>(`select * from cancel_withdraw()`));
    expect(r.status).toBe('active');
    p = await profileOf(db, a);
    expect(p?.status).toBe('active');
    expect(p?.withdraw_requested_at).toBeNull();
  });

  it('30일이 지나면 cancel_withdraw 는 거절', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    await db.query(
      `update profiles set status = 'withdrawing', withdraw_requested_at = now() - interval '31 days' where id = $1`,
      [a],
    );
    await expect(asMember(db, a, () => db.query(`select cancel_withdraw()`))).rejects.toThrow();
  });

  it('정지·탈퇴 회원이 쓰기 RPC 를 부르면 account_unavailable', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    await db.query(`update profiles set status = 'banned' where id = $1`, [a]);
    await expect(asMember(db, a, () => db.query(`select request_withdraw()`))).rejects.toThrow(
      /account_unavailable/,
    );
    await expect(asMember(db, a, () => db.query(`select set_my_marketing(true)`))).rejects.toThrow(
      /account_unavailable/,
    );
    await db.query(`update profiles set status = 'withdrawn' where id = $1`, [a]);
    await expect(asMember(db, a, () => db.query(`select update_my_account('a', null, null)`))).rejects.toThrow(
      /account_unavailable/,
    );
  });

  it('anon 은 RPC 를 부를 수 없다', async () => {
    const db = await newTestDb();
    await expect(asAnon(db, () => db.query(`select my_profile()`))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`select request_withdraw()`))).rejects.toThrow(/permission denied/);
  });
});

describe('탈퇴 확정', () => {
  it('30일 지난 탈퇴 신청 회원을 익명화하고 auth.users 에서 지운다', async () => {
    const db = await newTestDb();
    const old = await signUp(db, 'kakao', { full_name: '오래된' }, 'old@example.com');
    const recent = await signUp(db, 'google', { full_name: '최근' }, 'new@example.com');
    await db.query(
      `update profiles set status = 'withdrawing', withdraw_requested_at = now() - interval '31 days',
              phone = '01012345678', birth = '1990-01-01', gender = 'male' where id = $1`,
      [old],
    );
    await db.query(
      `update profiles set status = 'withdrawing', withdraw_requested_at = now() - interval '29 days' where id = $1`,
      [recent],
    );
    const [inv] = await db.query<{ id: string }>(
      `insert into invitations(owner_id, number, slug, theme_id, template_id, name, content)
       values ($1, '00000000001', 'abcdefghij', 'wedding', 'w1', '초대장', '{}') returning id`,
      [old],
    );
    await db.query(
      `insert into guestbook_entries(invitation_id, name, password_hash, content) values ($1, '하객', 'x', '축하')`,
      [inv.id],
    );
    await db.query(
      `insert into ledger_entries(number, user_id, invitation_id, kind, title, total)
       values ('L1', $1, $2, 'activate', '활성화', -50)`,
      [old, inv.id],
    );

    const [r] = await db.query<{ n: number }>(`select finalize_withdrawals() as n`);
    expect(r.n).toBe(1);

    const [c] = await db.query<{ n: number }>(`select count(*)::int as n from invitations`);
    expect(c.n).toBe(0);
    const [g] = await db.query<{ n: number }>(`select count(*)::int as n from guestbook_entries`);
    expect(g.n).toBe(0);
    const [l] = await db.query<{ user_id: string; invitation_id: string | null }>(
      `select user_id, invitation_id from ledger_entries where number = 'L1'`,
    );
    expect(l.user_id).toBe(old);
    expect(l.invitation_id).toBeNull();

    const p = await profileOf(db, old);
    expect(p?.status).toBe('withdrawn');
    expect(p?.name).toBe('탈퇴 회원');
    expect(p?.email).toBeNull();
    expect(p?.login_id).toBeNull();
    expect(p?.birth).toBeNull();
    expect(p?.gender).toBeNull();
    const [ph] = await db.query<{ phone: string | null }>(`select phone from profiles where id = $1`, [old]);
    expect(ph.phone).toBeNull();
    const [au] = await db.query<{ n: number }>(`select count(*)::int as n from auth.users where id = $1`, [old]);
    expect(au.n).toBe(0);

    const q = await profileOf(db, recent);
    expect(q?.status).toBe('withdrawing');
    expect(q?.email).toBe('new@example.com');
  });

  it('회원·anon 은 finalize_withdrawals 를 부를 수 없다', async () => {
    const db = await newTestDb();
    const a = await signUp(db, 'kakao');
    await expect(asMember(db, a, () => db.query(`select finalize_withdrawals()`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAnon(db, () => db.query(`select finalize_withdrawals()`))).rejects.toThrow(/permission denied/);
  });
});
