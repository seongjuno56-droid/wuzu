// 파일 올리기 서명 주소 발급. 규칙과 흐름은 _shared 의 순수 함수에 있고(jest 로 검사), 여기는 Deno 연결만 한다.
// 비밀값 R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET 은 Edge Function secrets 에만 둔다.
// 배포 때 --no-verify-jwt 를 쓴다: 로그인 확인은 아래에서 Supabase Auth 에 직접 묻는다.
import { AwsClient } from 'npm:aws4fetch@1.0.20';

import { presignPut } from '../_shared/presign.ts';
import { handleSignUpload } from '../_shared/signUpload.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`환경 변수 없음: ${name}`);
  return v;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] ?? null;
  // 앱이 보낸 공개 키를 그대로 Supabase 에 넘긴다. service_role 은 쓰지 않아 RLS·권한이 본인 기준으로 적용된다
  const apikey = req.headers.get('apikey') ?? '';
  const body = await req.json().catch(() => null);

  const result = await handleSignUpload(token, body, {
    async getUserId(t) {
      const r = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey, Authorization: `Bearer ${t}` } });
      if (r.status === 401 || r.status === 403) return null;
      if (!r.ok) throw new Error('auth');
      return ((await r.json()) as { id?: string }).id ?? null;
    },
    async record(t, f) {
      const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/record_media_file`, {
        method: 'POST',
        headers: { apikey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_invitation: f.invitationId, p_key: f.key, p_kind: f.kind, p_bytes: f.bytes }),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(e.message ?? 'record');
      }
    },
    sign(key, contentType, bytes) {
      const client = new AwsClient({
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
        service: 's3',
        region: 'auto',
      });
      return presignPut(client, { accountId: env('R2_ACCOUNT_ID'), bucket: env('R2_BUCKET') }, key, contentType, bytes);
    },
    randomId: () => crypto.randomUUID().replaceAll('-', ''),
  });

  return json(result.status, result.body);
});
