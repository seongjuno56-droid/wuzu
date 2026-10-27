import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/** 운영자 세션 쿠키 이름 */
export const SESSION_COOKIE = 'wuzu_admin';
/** 세션 유효 시간: 12시간 */
export const SESSION_TTL_SECONDS = 43200;

const ALG = 'HS256';

/** proxy 가 지금 요청 경로를 넣어 주는 요청 헤더. requireAdmin 이 읽는다 */
export const PATHNAME_HEADER = 'x-wuzu-pathname';

/** ADMIN_SESSION_SECRET 을 읽는다. 없거나 32자 미만이면 바로 오류를 낸다 */
function secretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET 이 설정되지 않았습니다. 32자 이상의 임의 문자열을 넣어 주세요.');
  }
  if (secret.length < 32) {
    throw new Error(`ADMIN_SESSION_SECRET 은 32자 이상이어야 합니다(지금 ${secret.length}자).`);
  }
  return new TextEncoder().encode(secret);
}

/** 운영자 id 를 담은 서명 토큰을 만든다 */
export async function signSession(adminId: string): Promise<string> {
  const key = secretKey();
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/**
 * 서명과 만료만 확인한다(DB 는 보지 않는다).
 * 토큰이 잘못됐으면 null, 비밀값 설정이 잘못됐으면 오류를 던진다.
 */
export async function verifySession(token: string): Promise<{ adminId: string } | null> {
  const key = secretKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALG],
      requiredClaims: ['sub', 'exp'],
    });
    if (typeof payload.sub !== 'string' || payload.sub === '') return null;
    return { adminId: payload.sub };
  } catch {
    return null;
  }
}
