import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * RPC 를 부르고 오류면 DB 가 올린 메시지(PAID_EDIT_REQUIRED 등)나 네트워크 오류 메시지로 던진다.
 * 언제나 POST 다: get: true 를 쓰면 인자(하객 토큰 포함)가 주소와 로그에 남는다.
 */
export function rpcCaller(client: SupabaseClient) {
  return async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = args === undefined ? await client.rpc(fn) : await client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
}
