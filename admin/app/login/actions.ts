'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { login } from '@/lib/admins';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from '@/lib/session';

export type LoginState = { error: string | null };

/** 로그인. 성공하면 세션 쿠키를 넣고 비밀번호 변경 또는 회원 화면으로 보낸다 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const result = await login(await getDb(), email, password);
  if (!result.ok) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };

  (await cookies()).set(SESSION_COOKIE, await signSession(result.adminId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(result.mustChangePassword ? '/password' : '/members');
}

/** 로그아웃. 세션 쿠키를 지우고 로그인 화면으로 */
export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
