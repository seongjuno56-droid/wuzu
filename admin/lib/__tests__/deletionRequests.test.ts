import { describe, expect, it } from 'vitest';
import type { Db } from '../db';
import { createDeletionRequest, listDeletionRequests, markDeletionRequestHandled } from '../deletionRequests';
import { addAdmin, newTestDb } from '../../test/db';

async function requestRows(db: Db) {
  return db.query<Record<string, unknown>>(`select * from deletion_requests order by created_at`);
}

async function logs(db: Db) {
  return db.query<Record<string, unknown>>(
    `select admin_id, action, target_type, target_id, memo from admin_audit_logs order by id`,
  );
}

describe('createDeletionRequest', () => {
  it('정상 입력은 저장한다 (앞뒤 공백 정리, 빈 칸은 null)', async () => {
    const db = await newTestDb();
    expect(
      await createDeletionRequest(db, {
        contactEmail: '  me@example.com ',
        provider: 'kakao',
        accountName: '  우주 ',
        message: '지워 주세요',
      }),
    ).toBe('ok');
    expect(await createDeletionRequest(db, { contactEmail: 'b@example.com', provider: 'unknown', accountName: ' ', message: '' })).toBe('ok');
    const rows = await requestRows(db);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ contact_email: 'me@example.com', provider: 'kakao', account_name: '우주', message: '지워 주세요', handled_at: null });
    expect(rows[1]).toMatchObject({ account_name: null, message: null });
  });

  it('잘못된 이메일·긴 입력·모르는 로그인 방식은 invalid, 저장 안 함', async () => {
    const db = await newTestDb();
    const base = { contactEmail: 'me@example.com', provider: 'google' as const };
    expect(await createDeletionRequest(db, { ...base, contactEmail: 'not-an-email' })).toBe('invalid');
    expect(await createDeletionRequest(db, { ...base, contactEmail: '' })).toBe('invalid');
    expect(await createDeletionRequest(db, { ...base, contactEmail: `${'a'.repeat(250)}@x.co` })).toBe('invalid');
    expect(await createDeletionRequest(db, { ...base, accountName: 'a'.repeat(51) })).toBe('invalid');
    expect(await createDeletionRequest(db, { ...base, message: 'a'.repeat(1001) })).toBe('invalid');
    expect(await createDeletionRequest(db, { ...base, provider: 'apple' as never })).toBe('invalid');
    expect(await requestRows(db)).toHaveLength(0);
    // 경계값은 통과
    expect(await createDeletionRequest(db, { ...base, accountName: 'a'.repeat(50), message: 'a'.repeat(1000) })).toBe('ok');
  });
});

describe('listDeletionRequests · markDeletionRequestHandled', () => {
  it('미처리/처리 완료로 나눠 보고, 처리하면 작업 기록 1줄, 다시 처리하면 already', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db, 'a@wuzu.kr', '김운영');
    await createDeletionRequest(db, { contactEmail: 'one@example.com', provider: 'kakao' });
    await createDeletionRequest(db, { contactEmail: 'two@example.com', provider: 'google' });

    const open = await listDeletionRequests(db, { handled: false, page: 1 });
    expect(open.total).toBe(2);
    expect((await listDeletionRequests(db, { handled: true, page: 1 })).total).toBe(0);

    const target = open.rows.find((r) => r.contactEmail === 'one@example.com')!;
    expect(await markDeletionRequestHandled(db, adminId, target.id, '회원 탈퇴 처리함')).toBe('ok');

    expect((await listDeletionRequests(db, { handled: false, page: 1 })).rows.map((r) => r.contactEmail)).toEqual(['two@example.com']);
    const done = await listDeletionRequests(db, { handled: true, page: 1 });
    expect(done.total).toBe(1);
    expect(done.rows[0]).toMatchObject({ contactEmail: 'one@example.com', handledByName: '김운영', memo: '회원 탈퇴 처리함' });
    expect(done.rows[0].handledAt).toBeInstanceOf(Date);

    expect(await logs(db)).toEqual([
      { admin_id: adminId, action: 'deletion_request.handle', target_type: 'deletion_request', target_id: target.id, memo: '회원 탈퇴 처리함' },
    ]);

    expect(await markDeletionRequestHandled(db, adminId, target.id, '또')).toBe('already');
    expect(await logs(db)).toHaveLength(1);
  });

  it('없는 요청은 not_found', async () => {
    const db = await newTestDb();
    const adminId = await addAdmin(db);
    expect(await markDeletionRequestHandled(db, adminId, '00000000-0000-0000-0000-000000000000', 'x')).toBe('not_found');
    expect(await markDeletionRequestHandled(db, adminId, 'abc', 'x')).toBe('not_found');
    expect(await logs(db)).toHaveLength(0);
  });
});
