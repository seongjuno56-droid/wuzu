'use server';

import { redirect } from 'next/navigation';
import { changePassword, MIN_PASSWORD_LENGTH, requireAdmin } from '@/lib/admins';
import { getDb } from '@/lib/db';

export type PasswordState = { error: string | null };

/** 비밀번호 변경. 비밀번호를 바꿔야 하는 운영자도 이 액션은 쓸 수 있다 */
export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await requireAdmin({ allowPasswordChange: true });
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (next !== confirm) return { error: '새 비밀번호와 확인이 같지 않습니다.' };

  const result = await changePassword(await getDb(), admin.id, current, next);
  if (result === 'wrong_current') return { error: '현재 비밀번호가 올바르지 않습니다.' };
  if (result === 'too_short') return { error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  if (result === 'same_as_current') return { error: '지금 비밀번호와 다른 비밀번호를 써 주세요.' };
  redirect('/members');
}
