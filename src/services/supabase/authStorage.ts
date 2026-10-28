/**
 * 앱 Supabase 세션을 기기에 저장할 때 쓰는 키.
 * auth-js(2.118) 는 이 키 아래에 세션(`키`), 사용자(`키-user`), PKCE 검증값(`키-code-verifier`,
 * `키-flows-code-verifier`, `키-flow-<id>-code-verifier`)을 둔다.
 */
export const AUTH_STORAGE_KEY = 'wuzu.auth';

interface KeyStorage {
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

/**
 * signOut 이 서버에 닿지 못해 로컬 세션을 지우지 못했을 때 직접 지운다.
 * (auth-js 는 토큰 재발급이 네트워크 오류면 저장된 세션을 남긴 채 error 만 돌려준다)
 */
export async function clearAuthStorage(storage: KeyStorage, key: string = AUTH_STORAGE_KEY): Promise<void> {
  const all = await storage.getAllKeys();
  const mine = all.filter((k) => k === key || k.startsWith(`${key}-`));
  if (mine.length) await storage.multiRemove(mine);
}
