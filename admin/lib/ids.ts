/** uuid 모양(대소문자 무관)인지. 주소·쿠키에서 온 id 를 DB 에 넘기기 전에 본다 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
