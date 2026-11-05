import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseInvitationService } from '../services/supabase/supabaseInvitationService';
import { createSupabaseRsvpService } from '../services/supabase/supabaseRsvpService';

export * from '../services/types';

/**
 * 공개 웹 빌드에서 `src/services/index.ts` 대신 쓴다(metro.config.js). 하객 화면은 공개 RPC 만 부르므로
 * 로그인·실시간·저장소 클라이언트와 mock 서비스를 번들에 넣지 않는다.
 * 빌드가 환경 변수를 검사하므로(guest-web-rules.js) 이 파일은 언제나 실서버다.
 */
const URL_BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** client.rpc 와 같은 모양. 오류 처리는 rpcCaller 가 한다. 네트워크 오류는 그대로 던진다 */
async function rpc(fn: string, args?: Record<string, unknown>) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args ?? {}),
  });
  const text = await res.text();
  let body: { message?: string } | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // 게이트웨이의 HTML 오류 화면 등. 아래에서 상태 코드로 던진다
  }
  if (res.ok) return { data: body, error: null };
  return { data: null, error: { message: body?.message ?? `HTTP ${res.status}` } };
}

const client = { rpc } as unknown as SupabaseClient;

export const usingMockAuth = false;
export const invitationService = createSupabaseInvitationService(client);
export const rsvpService = createSupabaseRsvpService(client);
/** 하객 화면은 usingMockAuth 일 때만 부른다. 공개 웹에서는 불리지 않는다 */
export const notificationService = { add: async (_notice: unknown) => {} };
