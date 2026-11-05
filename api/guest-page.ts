import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildGuestPage } from './_lib/og';

/**
 * /i/<slug> 요청(vercel.json rewrite)에 미리보기 태그를 넣은 하객 화면을 준다.
 * guest_invitation 만 부르고 publishable 키만 쓴다. 표지까지 3초 목표라 Supabase 를 오래 기다리지 않는다.
 */
const SUPABASE_TIMEOUT_MS = 2000;
// 파일을 못 읽는 일은 includeFiles 가 빠진 배포뿐이다. 그때도 500 대신 안내를 준다
const FALLBACK_SHELL = '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>wuzu</title></head><body>잠시 후 다시 열어 주세요.</body></html>';

let shell: string | undefined;
function readShell(): string {
  if (shell) return shell;
  try {
    shell = readFileSync(path.join(process.cwd(), 'dist', 'shell.html'), 'utf8');
    return shell;
  } catch (error) {
    console.error('shell.html 을 읽지 못했다', error);
    return FALLBACK_SHELL;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const url = new URL(request.url);
    const page = await buildGuestPage(url.searchParams.getAll('slug'), {
      shell: readShell(),
      env: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
        supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        mediaBaseUrl: process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? '',
        siteUrl: process.env.EXPO_PUBLIC_GUEST_WEB_URL || url.origin,
      },
      fetch,
      timeoutMs: SUPABASE_TIMEOUT_MS,
    });
    return new Response(page.body, { status: page.status, headers: page.headers });
  },
};
