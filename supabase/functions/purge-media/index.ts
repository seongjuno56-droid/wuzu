// 파일 삭제 대기열 비우기. pg_cron 이 매일 pg_net 으로 부른다(supabase/manual/schedule_guest_link.sql).
// 규칙은 _shared 의 순수 함수에 있고(jest 로 검사), 여기는 Deno 연결만 한다.
// 비밀값 PURGE_MEDIA_SECRET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET 은 Edge Function secrets 에만 둔다.
// 배포 때 --no-verify-jwt 를 쓴다: 회원이 부르는 함수가 아니고, x-purge-secret 헤더로 직접 확인한다.
import { AwsClient } from 'npm:aws4fetch@1.0.20';

import { handlePurgeMedia, pickServiceKey, serviceHeaders } from '../_shared/purgeMedia.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`환경 변수 없음: ${name}`);
  return v;
};

async function rpc(name: string, args: unknown): Promise<unknown> {
  const key = pickServiceKey(Deno.env.get('SUPABASE_SECRET_KEYS'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!key) throw new Error('secret 키 없음');
  const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: serviceHeaders(key),
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    await r.body?.cancel();
    throw new Error(`rpc ${r.status}`);
  }
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const result = await handlePurgeMedia(req.headers.get('x-purge-secret'), {
    secret: Deno.env.get('PURGE_MEDIA_SECRET'),
    async claim(limit) {
      const rows = (await rpc('media_purge_claim', { p_limit: limit })) as { r2_key: string; kind: string }[];
      return rows.map((r) => ({ key: r.r2_key, kind: r.kind }));
    },
    async deleteObject(key) {
      const client = new AwsClient({
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
        service: 's3',
        region: 'auto',
        // aws4fetch 기본값은 5xx·429 에 10번 다시 시도한다. 실패한 파일은 다음 실행이 다시 지우므로 시간을 쓰지 않는다
        retries: 0,
      });
      const r = await client.fetch(`https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${env('R2_BUCKET')}/${key}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5_000),
      });
      await r.body?.cancel();
      return r.status;
    },
    async markDone(keys) {
      await rpc('media_purge_done', { p_keys: keys });
    },
    now: () => Date.now(),
    log: (message) => console.log(message),
  });

  return json(result.status, result.body);
});
