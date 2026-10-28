import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admins';
import { toCsv } from '@/lib/csv';
import { getDb } from '@/lib/db';
import { compactDate, formatDateTime } from '@/lib/format';
import { exportInvitations, invitationFilterFrom } from '@/lib/invitations';
import { INVITATION_STATE_LABEL, THEME_LABEL } from '@/lib/labels';
import { parseListQuery, type SearchParams } from '@/lib/listQuery';

/** 초대장 CSV: 목록에서 걸러 본 조건 그대로, 최대 5,000줄 */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const sp: SearchParams = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    sp[key] = request.nextUrl.searchParams.getAll(key);
  }
  const now = new Date();
  const rows = await exportInvitations(await getDb(), invitationFilterFrom(parseListQuery(sp), now));

  const csv = toCsv(
    ['초대장 id', '초대장No', '이름', '테마', '상태', '숨김', '만든 회원 id', '만든 사람', '활성화일', '만료일', '만든 날'],
    rows.map((i) => [
      i.id,
      i.number,
      i.name,
      THEME_LABEL[i.themeId] ?? i.themeId,
      INVITATION_STATE_LABEL[i.state] ?? i.state,
      i.banned ? '숨김' : '',
      i.ownerId,
      i.ownerName,
      formatDateTime(i.activatedAt),
      formatDateTime(i.expiresAt),
      formatDateTime(i.createdAt),
    ]),
  );
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="invitations-${compactDate(now)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
