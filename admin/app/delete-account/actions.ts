'use server';

import { getDb } from '@/lib/db';
import { createDeletionRequest, DELETION_PROVIDERS, type DeletionProvider } from '@/lib/deletionRequests';

export type DeletionRequestState = { done: boolean; error: string | null };

/**
 * 로그인 없이 받는 계정 삭제 요청. 회원인지 확인하지 않고 저장만 한다.
 * 숨은 칸 website 가 채워져 있으면 자동 입력 봇으로 보고 저장하지 않지만, 똑같이 성공 화면을 보여 준다.
 */
export async function submitDeletionRequestAction(
  _prev: DeletionRequestState,
  formData: FormData,
): Promise<DeletionRequestState> {
  if (String(formData.get('website') ?? '').trim()) return { done: true, error: null };

  const rawProvider = String(formData.get('provider') ?? 'unknown');
  const provider: DeletionProvider = (DELETION_PROVIDERS as readonly string[]).includes(rawProvider)
    ? (rawProvider as DeletionProvider)
    : 'unknown';

  const result = await createDeletionRequest(await getDb(), {
    contactEmail: String(formData.get('contactEmail') ?? ''),
    provider,
    accountName: String(formData.get('accountName') ?? ''),
    message: String(formData.get('message') ?? ''),
  });
  if (result === 'invalid') {
    return {
      done: false,
      error: '이메일 주소와 글자 수를 확인해 주세요. / Please check your email address and the length of each field.',
    };
  }
  return { done: true, error: null };
}
