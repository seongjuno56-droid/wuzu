/** 지울 수 있는 키의 끝부분. record_media_file(20261104000003_media_files.sql)의 표와 같다 */
const KEY_ENDINGS: Record<string, RegExp> = {
  image: /^\.(webp|jpg|png)$/,
  thumb: /^_thumb\.(webp|jpg|png)$/,
  linkThumb: /^\.(jpg|png)$/,
  gif: /^\.gif$/,
  video: /^\.(mp4|mov)$/,
  bgm: /^\.(mp3|m4a|aac|wav|ogg)$/,
};
const KEY_HEAD = /^invitations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{32}/;

/** R2 에 삭제를 보내도 되는 키인지. 값이 잘못되어도 다른 파일이 지워지지 않게 전체 모양을 본다 */
export function isPurgeableKey(key: string, kind: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(KEY_ENDINGS, kind)) return false;
  const head = KEY_HEAD.exec(key);
  if (!head) return false;
  return KEY_ENDINGS[kind].test(key.slice(head[0].length));
}

/** 비밀값 비교. 다른 위치와 상관없이 긴 쪽 길이만큼 끝까지 돈다 */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  const n = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < n; i += 1) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export interface PurgeMediaDeps {
  /** Edge Function 비밀값 PURGE_MEDIA_SECRET. 비었거나 짧으면 어떤 요청도 받지 않는다 */
  secret: string | undefined;
  claim(limit: number): Promise<{ key: string; kind: string }[]>;
  /** R2 삭제의 HTTP 상태 */
  deleteObject(key: string): Promise<number>;
  markDone(keys: string[]): Promise<void>;
  now(): number;
  /** 수와 상태만 넘긴다. 키·오류 내용은 넣지 않는다(서명·비밀값이 섞일 수 있다) */
  log(message: string): void;
}

const MIN_SECRET_LENGTH = 32;
const BATCH = 50;
const CONCURRENCY = 5;
/**
 * Edge Function 은 150초 안에 답해야 한다. 묶음 하나가 최악 80초(읽기 15초, 삭제 50초 = 50개 ÷ 동시 5개 × 5초, 표시 15초)이므로
 * 65초까지만 새 묶음을 읽는다. 남은 파일은 다음 실행이 지운다
 */
const TIME_BUDGET_MS = 65_000;

async function deleteAll(
  keys: string[],
  deleteObject: PurgeMediaDeps['deleteObject'],
): Promise<{ done: string[]; failedStatuses: string[] }> {
  const done: string[] = [];
  const failedStatuses: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < keys.length) {
      const key = keys[next];
      next += 1;
      let status: string;
      try {
        const s = await deleteObject(key);
        // 2xx 만 지운 것으로 친다. 404 는 버킷 이름이 틀려도(NoSuchBucket) 오므로, 표시하면 파일이 남은 채 대기열에서 사라진다
        if (s >= 200 && s < 300) {
          done.push(key);
          continue;
        }
        status = String(s);
      } catch {
        status = 'error';
      }
      failedStatuses.push(status);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { done, failedStatuses };
}

/**
 * 삭제 대기열 비우기: 비밀값 확인 → 작은 묶음으로 읽기 → 키 검사 → R2 삭제 → 지운 것만 표시.
 * 실패한 파일은 표시하지 않으므로 다음 실행에 다시 나온다. 표시가 실패해도 다음에 또 지우면 되므로 안전하다.
 */
export async function handlePurgeMedia(
  givenSecret: string | null,
  deps: PurgeMediaDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!deps.secret || deps.secret.length < MIN_SECRET_LENGTH) {
    deps.log('[purge-media] 비밀값이 설정되지 않았다');
    return { status: 500, body: { error: 'server_error' } };
  }
  if (!constantTimeEqual(givenSecret ?? '', deps.secret)) {
    return { status: 401, body: { error: 'unauthorized' } };
  }

  const started = deps.now();
  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  try {
    while (deps.now() - started < TIME_BUDGET_MS) {
      const batch = await deps.claim(BATCH);
      const keys = batch.filter((f) => isPurgeableKey(f.key, f.kind)).map((f) => f.key);
      skipped += batch.length - keys.length;
      const { done, failedStatuses } = await deleteAll(keys, deps.deleteObject);
      if (done.length > 0) await deps.markDone(done);
      deleted += done.length;
      failed += failedStatuses.length;
      if (failedStatuses.length > 0) {
        deps.log(`[purge-media] 삭제 실패 ${failedStatuses.length}건, 상태 ${[...new Set(failedStatuses)].join(',')}`);
      }
      if (batch.length < BATCH) break;
    }
  } catch {
    deps.log(`[purge-media] 대기열 처리 실패, 지금까지 ${deleted}건`);
    return { status: 500, body: { error: 'server_error' } };
  }
  deps.log(`[purge-media] 지움 ${deleted}, 실패 ${failed}, 건너뜀 ${skipped}`);
  return { status: 200, body: { deleted, failed, skipped } };
}

/**
 * Supabase secret 키로 PostgREST 를 부를 때의 헤더.
 * 새 키(sb_secret_…)는 JWT 가 아니라 apikey 로만 보낸다. 옛 service_role JWT 는 Authorization 에도 넣는다.
 */
export function serviceHeaders(key: string): Record<string, string> {
  return key.startsWith('sb_')
    ? { apikey: key, 'Content-Type': 'application/json' }
    : { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

/**
 * Edge Function 이 쓸 secret 키. 기본 제공 SUPABASE_SECRET_KEYS(JSON 사전)의 default 를 먼저 쓰고, 없으면 옛 SUPABASE_SERVICE_ROLE_KEY.
 */
export function pickServiceKey(secretKeysJson: string | undefined, legacy: string | undefined): string | null {
  if (secretKeysJson) {
    try {
      const v = (JSON.parse(secretKeysJson) as Record<string, unknown>).default;
      if (typeof v === 'string' && v) return v;
    } catch {
      // 아래 옛 키로 넘어간다. 값이 오류에 실리지 않게 다시 던지지 않는다
    }
  }
  return legacy || null;
}
