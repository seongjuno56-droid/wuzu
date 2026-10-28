'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admins';
import { REASON_MAX_LENGTH, type ActionResult } from '@/lib/actionResult';
import { getDb } from '@/lib/db';
import { markDeletionRequestHandled } from '@/lib/deletionRequests';

/**
 * 계정 삭제 요청을 처리 완료로 표시한다. 메모는 formData 'memo' (필수, 작업 기록에 남는다).
 * 목록에서 markDeletionRequestHandledAction.bind(null, requestId) 로 묶어 쓴다.
 */
export async function markDeletionRequestHandledAction(requestId: string, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof requestId !== 'string') return { ok: false, message: '잘못된 요청입니다.' };
  const memo = String(formData.get('memo') ?? '').trim();
  if (!memo) return { ok: false, message: '처리 메모를 적어 주세요.' };
  if (memo.length > REASON_MAX_LENGTH) {
    return { ok: false, message: `메모는 ${REASON_MAX_LENGTH}자 이하로 적어 주세요.` };
  }

  const result = await markDeletionRequestHandled(await getDb(), admin.id, requestId, memo);
  if (result === 'not_found') return { ok: false, message: '요청을 찾을 수 없습니다.' };
  if (result === 'already') return { ok: false, message: '이미 처리된 요청입니다.' };
  revalidatePath('/deletion-requests');
  return { ok: true };
}
