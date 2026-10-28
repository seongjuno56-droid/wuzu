'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admins';
import { REASON_MAX_LENGTH, type ActionResult } from '@/lib/actionResult';
import { getDb } from '@/lib/db';
import { setInvitationBanned } from '@/lib/invitations';

/**
 * 초대장 숨김(banned=true)·숨김 해제(false). 사유는 formData 'memo'.
 * 목록에서 setInvitationBannedAction.bind(null, invitationId, banned) 로 묶어 쓴다.
 */
export async function setInvitationBannedAction(
  invitationId: string,
  banned: boolean,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof invitationId !== 'string' || typeof banned !== 'boolean') {
    return { ok: false, message: '잘못된 요청입니다.' };
  }
  const memo = String(formData.get('memo') ?? '').trim();
  if (!memo) return { ok: false, message: '사유를 적어 주세요.' };
  if (memo.length > REASON_MAX_LENGTH) {
    return { ok: false, message: `사유는 ${REASON_MAX_LENGTH}자 이하로 적어 주세요.` };
  }

  const result = await setInvitationBanned(await getDb(), admin.id, invitationId, banned, memo);
  if (result === 'not_found') return { ok: false, message: '초대장을 찾을 수 없습니다.' };
  revalidatePath('/invitations');
  // 회원 상세의 초대장 표에도 숨김 표시가 있다
  revalidatePath('/members/[id]', 'page');
  return { ok: true };
}
