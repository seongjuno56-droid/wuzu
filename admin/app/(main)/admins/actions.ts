'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdmin, MIN_PASSWORD_LENGTH, normalizeEmail, requireAdmin, setAdminActive } from '@/lib/admins';
import type { ActionResult } from '@/lib/actionResult';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE } from '@/lib/session';

/** 운영자 추가 결과. 성공하면 화면이 안내를 띄울 수 있게 이메일을 돌려준다(비밀번호는 돌려주지 않는다) */
export type CreateAdminActionResult = { ok: true; email: string } | { ok: false; message: string };

const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 50;

/** 운영자 추가. formData: name·email·tempPassword */
export async function createAdminAction(formData: FormData): Promise<CreateAdminActionResult> {
  const admin = await requireAdmin();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const name = String(formData.get('name') ?? '').trim();
  const tempPassword = String(formData.get('tempPassword') ?? '');

  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: '이메일을 확인해 주세요.' };
  }
  if (!name || name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: `이름은 1~${NAME_MAX_LENGTH}자로 적어 주세요.` };
  }

  const result = await createAdmin(await getDb(), admin.id, { email, name, tempPassword });
  if (result === 'too_short') {
    return { ok: false, message: `임시 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.` };
  }
  if (result === 'duplicate') return { ok: false, message: '이미 등록된 이메일이에요.' };
  revalidatePath('/admins');
  return { ok: true, email };
}

/**
 * 운영자 비활성화(active=false)·다시 켜기(true). 자기 자신도 같은 규칙.
 * 목록에서 setAdminActiveAction.bind(null, adminId, active) 로 묶어 쓴다.
 */
export async function setAdminActiveAction(targetId: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof targetId !== 'string' || typeof active !== 'boolean') {
    return { ok: false, message: '잘못된 요청입니다.' };
  }
  const result = await setAdminActive(await getDb(), admin.id, targetId, active);
  if (result === 'not_found') return { ok: false, message: '운영자를 찾을 수 없습니다.' };
  if (result === 'last_admin') return { ok: false, message: '마지막 남은 운영자는 비활성화할 수 없어요.' };

  // 자기 자신을 껐으면 더 쓸 수 없으므로 세션을 지우고 로그인 화면으로
  if (targetId === admin.id && !active) {
    (await cookies()).delete(SESSION_COOKIE);
    redirect('/login');
  }
  revalidatePath('/admins');
  return { ok: true };
}
