import { checkUpload, thumbKeyOf } from './uploadRules.ts';

export interface SignUploadDeps {
  /** 토큰이 틀리면 null */
  getUserId(token: string): Promise<string | null>;
  /** 로그인한 본인 권한으로 기록한다. 남의 초대장이면 DB 가 NOT_FOUND 로 던진다 */
  record(token: string, file: { invitationId: string; key: string; kind: string; bytes: number }): Promise<void>;
  sign(key: string, contentType: string, bytes: number): Promise<{ url: string; headers: Record<string, string> }>;
  /** 추측할 수 없는 난수(소문자 16진수) */
  randomId(): string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANSWER = (status: number, error: string) => ({ status, body: { error } as Record<string, unknown> });

/**
 * 서명 요청 처리: 로그인 → 값 검사 → 소유 확인과 기록 → 서명.
 * 내부 오류 내용은 응답에 넣지 않는다(비밀값이 섞일 수 있다).
 */
export async function handleSignUpload(
  token: string | null,
  body: unknown,
  deps: SignUploadDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!token) return ANSWER(401, 'unauthorized');
  try {
    if (!(await deps.getUserId(token))) return ANSWER(401, 'unauthorized');
  } catch {
    return ANSWER(500, 'server_error');
  }

  if (typeof body !== 'object' || body === null) return ANSWER(400, 'invalid');
  const { invitationId, kind, contentType, bytes, mainKey } = body as Record<string, unknown>;
  if (typeof invitationId !== 'string' || !UUID_RE.test(invitationId)) return ANSWER(400, 'invalid');
  const check = checkUpload({ kind, contentType, bytes });
  if (!check.ok) return ANSWER(400, check.reason);

  const folder = `invitations/${invitationId}/`;
  let key = `${folder}${deps.randomId()}.${check.ext}`;
  if (kind === 'thumb') {
    // 작은 사진 주소는 본 이미지 주소에서 만들므로 확장자까지 같아야 한다
    if (typeof mainKey !== 'string' || !mainKey.startsWith(folder)) return ANSWER(400, 'invalid');
    if (!/^[0-9a-f]{32}$/.test(mainKey.slice(folder.length, -(check.ext.length + 1))) || !mainKey.endsWith(`.${check.ext}`)) {
      return ANSWER(400, 'invalid');
    }
    key = thumbKeyOf(mainKey);
  }

  try {
    await deps.record(token, { invitationId, key, kind: kind as string, bytes: bytes as number });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'NOT_FOUND' || message === 'account_unavailable') return ANSWER(403, 'forbidden');
    if (message === 'TOO_MANY') return ANSWER(400, 'too_many');
    return ANSWER(500, 'server_error');
  }

  try {
    const signed = await deps.sign(key, contentType as string, bytes as number);
    return { status: 200, body: { key, url: signed.url, headers: signed.headers } };
  } catch {
    return ANSWER(500, 'server_error');
  }
}
