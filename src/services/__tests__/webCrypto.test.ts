import { createHash } from 'crypto';

import { installWebCrypto } from '../supabase/webCrypto';

jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((a: Uint32Array) => a.fill(7)),
  digest: jest.fn(async (_algorithm: string, data: Uint8Array) => {
    const hash = jest.requireActual('crypto').createHash('sha256').update(data).digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.length);
  }),
}));

const g = globalThis as unknown as { crypto?: unknown };
const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

function setCrypto(value: unknown) {
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
}

describe('PKCE 용 WebCrypto', () => {
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete g.crypto;
    jest.resetModules();
  });

  it('crypto 가 없으면 난수와 SHA-256 을 채운다', async () => {
    setCrypto(undefined);
    installWebCrypto();
    const c = g.crypto as Crypto;
    expect(Array.from(c.getRandomValues(new Uint32Array(2)))).toEqual([7, 7]);
    const data = new TextEncoder().encode('abc');
    const out = await c.subtle.digest('SHA-256', data);
    expect(Buffer.from(out).toString('hex')).toBe(createHash('sha256').update('abc').digest('hex'));
  });

  it('getRandomValues 만 있는 환경은 그것을 두고 subtle 만 채운다', () => {
    const own = jest.fn();
    setCrypto({ getRandomValues: own });
    installWebCrypto();
    const c = g.crypto as Crypto;
    expect(c.getRandomValues).toBe(own);
    expect(typeof c.subtle.digest).toBe('function');
  });

  it('이미 다 있는 환경(웹)은 건드리지 않는다', () => {
    const digest = jest.fn();
    const own = jest.fn();
    setCrypto({ getRandomValues: own, subtle: { digest } });
    installWebCrypto();
    const c = g.crypto as Crypto;
    expect(c.getRandomValues).toBe(own);
    expect(c.subtle.digest).toBe(digest);
  });

  it('Supabase 가 plain 이 아니라 s256 으로 만든다', async () => {
    setCrypto(undefined);
    installWebCrypto();
    const { getCodeChallengeAndMethod } = jest.requireActual('@supabase/auth-js/dist/main/lib/helpers');
    const store = new Map<string, string>();
    const storage = {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
      removeItem: async (k: string) => void store.delete(k),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const [challenge, method] = await getCodeChallengeAndMethod(storage, 'sb-test');
    expect(method).toBe('s256');
    expect(warn).not.toHaveBeenCalled();
    const verifier = [...store.values()][0].split('/')[0].replace(/"/g, '');
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
    warn.mockRestore();
  });
});
