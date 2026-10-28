import 'server-only';
import { withAudit } from './audit';
import type { Db } from './db';
import { isUuid } from './ids';
import { PAGE_SIZE, safePage } from './listQuery';
import {
  ACCOUNT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  DELETION_MESSAGE_MAX,
  DELETION_PROVIDERS,
  type DeletionProvider,
} from './deletionRequestRules';

// 값 목록·글자 수 제한은 공개 폼도 쓰므로 deletionRequestRules.ts 에 있다
export * from './deletionRequestRules';

export interface DeletionRequestInput {
  contactEmail: string;
  provider: DeletionProvider;
  accountName?: string;
  message?: string;
}

export interface DeletionRequestRow {
  id: string;
  contactEmail: string;
  provider: DeletionProvider;
  accountName: string | null;
  message: string | null;
  createdAt: Date;
  handledAt: Date | null;
  handledByName: string | null;
  /** 처리할 때 적은 메모 (작업 기록에서 가져온다) */
  memo: string | null;
}

/** 아주 느슨한 이메일 모양 확인: 공백 없이 a@b.c */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 앞뒤 공백을 지우고 빈 글자면 null */
function optional(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  return v ? v : null;
}

/**
 * 로그인 없이 받는 계정 삭제 요청을 저장한다.
 * 회원인지 여부는 확인하지 않는다(요청한 사람에게 회원 여부를 알려 주지 않기 위해).
 */
export async function createDeletionRequest(db: Db, input: DeletionRequestInput): Promise<'ok' | 'invalid'> {
  const email = (input.contactEmail ?? '').trim();
  const accountName = optional(input.accountName);
  const message = optional(input.message);
  if (email.length > CONTACT_EMAIL_MAX || !EMAIL_RE.test(email)) return 'invalid';
  if (!(DELETION_PROVIDERS as readonly string[]).includes(input.provider)) return 'invalid';
  if (accountName && accountName.length > ACCOUNT_NAME_MAX) return 'invalid';
  if (message && message.length > DELETION_MESSAGE_MAX) return 'invalid';

  await db.query(
    `insert into deletion_requests(contact_email, provider, account_name, message) values ($1, $2, $3, $4)`,
    [email, input.provider, accountName, message],
  );
  return 'ok';
}

/** 미처리(handled=false, 오래된 순) 또는 처리 완료(handled=true, 최근 처리순) 목록, PAGE_SIZE 개씩 */
export async function listDeletionRequests(
  db: Db,
  q: { handled: boolean; page: number },
): Promise<{ rows: DeletionRequestRow[]; total: number }> {
  const where = q.handled ? 'r.handled_at is not null' : 'r.handled_at is null';
  // 미처리는 오래 기다린 요청부터, 처리 완료는 최근 처리한 것부터
  const order = q.handled ? 'r.handled_at desc, r.id desc' : 'r.created_at asc, r.id asc';
  const [{ total }] = await db.query<{ total: number }>(
    `select count(*)::int as total from deletion_requests r where ${where}`,
  );
  const page = safePage(q.page);
  const rows = await db.query<DeletionRequestRow>(
    `select r.id, r.contact_email as "contactEmail", r.provider, r.account_name as "accountName",
            r.message, r.created_at as "createdAt", r.handled_at as "handledAt",
            a.name as "handledByName",
            (select l.memo from admin_audit_logs l
              where l.target_type = 'deletion_request' and l.target_id = r.id::text
                and l.action = 'deletion_request.handle'
              order by l.id desc limit 1) as memo
       from deletion_requests r
       left join admins a on a.id = r.handled_by
      where ${where}
      order by ${order}
      limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
  );
  return { rows, total };
}

export type HandleDeletionResult = 'ok' | 'not_found' | 'already';

/** 요청을 처리 완료로 표시하고 작업 기록에 메모와 함께 남긴다. 이미 처리된 요청은 바꾸지 않는다 */
export async function markDeletionRequestHandled(
  db: Db,
  adminId: string,
  id: string,
  memo: string,
): Promise<HandleDeletionResult> {
  if (!isUuid(id)) return 'not_found';
  return withAudit(
    db,
    { adminId, action: 'deletion_request.handle', targetType: 'deletion_request', targetId: id, memo },
    async (tx) => {
      const unchanged = (result: HandleDeletionResult) => ({ before: null, after: null, changed: false, result });
      const [row] = await tx.query<{ handledAt: Date | null }>(
        `select handled_at as "handledAt" from deletion_requests where id = $1 for update`,
        [id],
      );
      if (!row) return unchanged('not_found');
      if (row.handledAt) return unchanged('already');
      await tx.query(`update deletion_requests set handled_at = now(), handled_by = $1 where id = $2`, [adminId, id]);
      return { before: { handled: false }, after: { handled: true }, changed: true, result: 'ok' as const };
    },
  );
}
