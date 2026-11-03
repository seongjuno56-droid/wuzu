import * as ExpoCrypto from 'expo-crypto';

/**
 * React Native 에는 WebCrypto 가 없어 Supabase 가 PKCE 를 약하게 처리한다
 * (crypto 가 없으면 검증값을 Math.random 으로 만들고, subtle 이 없으면 plain 방식으로 보낸다).
 * Supabase 가 쓰는 두 함수만 expo-crypto 로 채워 S256 으로 동작하게 한다. 이미 있는 환경(웹)은 건드리지 않는다.
 */
export function installWebCrypto() {
  const target = globalThis as unknown as { crypto?: Record<string, unknown> };
  const current = target.crypto ?? {};
  if (typeof current.getRandomValues !== 'function') {
    current.getRandomValues = (array: Uint32Array) => ExpoCrypto.getRandomValues(array);
  }
  const subtle = (current.subtle ?? {}) as Record<string, unknown>;
  if (typeof subtle.digest !== 'function') {
    subtle.digest = (algorithm: string, data: BufferSource) =>
      ExpoCrypto.digest(algorithm as ExpoCrypto.CryptoDigestAlgorithm, data);
    current.subtle = subtle;
  }
  if (!target.crypto) target.crypto = current;
}
