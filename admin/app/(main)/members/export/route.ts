import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admins';
import { toCsv } from '@/lib/csv';
import { getDb } from '@/lib/db';
import { compactDate, formatDateTime } from '@/lib/format';
import { parseListQuery, type SearchParams } from '@/lib/listQuery';
import { exportMembers, MEMBER_STATUS_LABEL, memberFilterFrom, PROVIDER_LABEL } from '@/lib/members';

/** 회원 CSV: 목록에서 걸러 본 조건 그대로, 최대 5,000줄 */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const sp: SearchParams = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    sp[key] = request.nextUrl.searchParams.getAll(key);
  }
  const rows = await exportMembers(await getDb(), memberFilterFrom(parseListQuery(sp)));

  const csv = toCsv(
    ['회원 id', '아이디', '이메일', '이름', '가입 경로', '상태', '레터 잔액', '초대장 수', '가입일'],
    rows.map((m) => [
      m.id,
      m.loginId,
      m.email,
      m.name,
      PROVIDER_LABEL[m.provider] ?? m.provider,
      MEMBER_STATUS_LABEL[m.status] ?? m.status,
      m.balance,
      m.invitationCount,
      formatDateTime(m.createdAt),
    ]),
  );
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="members-${compactDate(new Date())}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
