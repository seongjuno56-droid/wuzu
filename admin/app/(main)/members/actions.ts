'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admins';
import { REASON_MAX_LENGTH, type ActionResult } from '@/lib/actionResult';
import { getDb } from '@/lib/db';
import { setMemberBanned } from '@/lib/members';

/**
 * 회원 정지(banned=true)·정지 해제(false). 사유는 formData 'memo'.
 * 상세 화면에서 setMemberBannedAction.bind(null, memberId, banned) 로 묶어 쓴다.
 */
export async function setMemberBannedAction(
  memberId: string,
  banned: boolean,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof memberId !== 'string' || typeof banned !== 'boolean') {
    return { ok: false, message: '잘못된 요청입니다.' };
  }
  const memo = String(formData.get('memo') ?? '').trim();
  if (!memo) return { ok: false, message: '사유를 적어 주세요.' };
  if (memo.length > REASON_MAX_LENGTH) {
    return { ok: false, message: `사유는 ${REASON_MAX_LENGTH}자 이하로 적어 주세요.` };
  }

  const result = await setMemberBanned(await getDb(), admin.id, memberId, banned, memo);
  if (result === 'not_found') return { ok: false, message: '회원을 찾을 수 없습니다.' };
  if (result === 'withdrawing') {
    return { ok: false, message: '탈퇴 진행 중인 회원은 정지·해제할 수 없습니다.' };
  }
  if (result === 'withdrawn') return { ok: false, message: '탈퇴한 회원은 정지·해제할 수 없습니다.' };
  revalidatePath('/members');
  revalidatePath(`/members/${memberId}`);
  return { ok: true };
}
