import { checkUpload, UPLOAD_RULES, type UploadKind } from '../../../supabase/functions/_shared/uploadRules';
import type { Invitation } from '../../features/invitation/model';
import { withTimeout } from '../withTimeout';
import { collectLocalMedia, isLocalMedia, isServerId, type LocalMedia, mapInvitationMedia, stripLocalMedia } from './localMedia';

export interface SignRequest {
  invitationId: string;
  kind: UploadKind;
  contentType: string;
  bytes: number;
  /** 작은 사진일 때 본 이미지의 키 */
  mainKey?: string;
}
export interface SignedUpload {
  key: string;
  url: string;
  headers: Record<string, string>;
}
/** 올린 결과. 재시도에서 이미 끝난 일을 건너뛴다 */
export interface UploadedFile {
  key: string;
  url: string;
  contentType: string;
  /** 작은 사진을 만들 원본(줄였으면 줄인 파일) */
  source: string;
  thumbDone: boolean;
}

export interface UploadDeps {
  sign(request: SignRequest): Promise<SignedUpload>;
  read(uri: string): Promise<{ body: Blob; type: string; bytes: number }>;
  put(url: string, headers: Record<string, string>, body: Blob, signal: AbortSignal): Promise<void>;
  /** 긴 변 1080px 로 다시 저장한 파일 주소 */
  recompress(uri: string): Promise<string>;
  /** 긴 변 400px 작은 사진을 본 이미지와 같은 형식으로 만든 파일 주소 */
  makeThumb(uri: string, contentType: string): Promise<string>;
  publicUrl(key: string): string;
  /** `초대장 id|기기 주소` → 올린 결과. 저장을 다시 눌러도 이어 가도록 호출 사이에 유지한다 */
  uploaded: Map<string, UploadedFile>;
  onProgress?: (done: number, total: number) => void;
}

/** 파일을 올리지 못했다. 화면은 이 오류만 "사진을 올리지 못했어요" 로 안내한다 */
export class MediaUploadError extends Error {
  constructor(cause?: unknown) {
    super('MEDIA_UPLOAD_FAILED');
    this.name = 'MediaUploadError';
    this.cause = cause;
  }
}

const CONCURRENCY = 3;
const SIGN_TIMEOUT_MS = 20_000;
/** 느린 LTE 를 생각해 초당 100KB 를 기준으로 잡는다. 20MB 동영상이면 4분 반쯤 */
const putTimeoutMs = (bytes: number) => 30_000 + bytes / 100;

const EXT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};
const extOf = (s: string) => /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(s)?.[1].toLowerCase() ?? '';

/**
 * 올릴 형식. BGM 은 파일 이름이 가장 믿을 만하고, 그 밖은 파일 주소·읽은 형식 순.
 * 사진은 모르면 null(다시 줄여 형식을 정한다). 그 밖은 content: 주소에 확장자도 형식도 없을 수 있어 그 종류의 첫 형식으로 둔다
 */
function contentTypeOf(kind: UploadKind, names: (string | undefined)[], blobType: string): string | null {
  const allowed = UPLOAD_RULES[kind].types;
  const candidates = [...names.map((n) => (n ? EXT_TYPES[extOf(n)] : undefined)), blobType.split(';')[0].toLowerCase()];
  const found = candidates.find((t): t is string => !!t && t in allowed);
  return found ?? (kind === 'image' ? null : Object.keys(allowed)[0]);
}

async function send(deps: UploadDeps, request: SignRequest, body: Blob): Promise<string> {
  const check = checkUpload(request);
  if (!check.ok) throw new Error(`upload_${check.reason}`);
  const signed = await withTimeout(() => deps.sign(request), SIGN_TIMEOUT_MS);
  await withTimeout((signal) => deps.put(signed.url, signed.headers, body, signal), putTimeoutMs(request.bytes));
  return signed.key;
}

async function uploadOne(inv: Invitation, item: LocalMedia, deps: UploadDeps): Promise<void> {
  const memoKey = `${inv.id}|${item.uri}`;
  let memo = deps.uploaded.get(memoKey);
  if (!memo) {
    // 사진 앱 주소(ph:)는 fetch 로 읽지 못하고 변환 모듈만 읽는다
    let source = item.kind === 'image' && /^ph:/i.test(item.uri) ? await deps.recompress(item.uri) : item.uri;
    let file = await deps.read(source);
    let type = contentTypeOf(item.kind, [item.fileName, source], file.type);
    // 기기에서 변환하지 못하고 원본이 남은 사진(HEIC 등)이나 너무 큰 사진은 여기서 다시 줄인다
    if (item.kind === 'image' && (!type || file.bytes > UPLOAD_RULES.image.maxBytes)) {
      source = await deps.recompress(source);
      file = await deps.read(source);
      type = contentTypeOf('image', [source], file.type);
    }
    if (!type) throw new Error('upload_type');
    const key = await send(deps, { invitationId: inv.id, kind: item.kind, contentType: type, bytes: file.bytes }, file.body);
    memo = { key, url: deps.publicUrl(key), contentType: type, source, thumbDone: item.kind !== 'image' };
    deps.uploaded.set(memoKey, memo);
  }
  if (!memo.thumbDone) {
    const thumb = await deps.read(await deps.makeThumb(memo.source, memo.contentType));
    await send(
      deps,
      { invitationId: inv.id, kind: 'thumb', contentType: memo.contentType, bytes: thumb.bytes, mainKey: memo.key },
      thumb.body,
    );
    memo.thumbDone = true;
  }
}

/**
 * 기기 주소의 파일을 R2 에 올리고 주소를 공개 주소로 바꾼 복사본을 돌려준다. 원본은 고치지 않는다.
 * 하나라도 실패하면 MediaUploadError 를 던진다. 끝난 파일은 deps.uploaded 에 남아 다시 올리지 않는다.
 */
export async function uploadDraftMedia(inv: Invitation, deps: UploadDeps): Promise<Invitation> {
  const seen = new Set<string>();
  const items = collectLocalMedia(inv).filter((m) => !seen.has(m.uri) && !!seen.add(m.uri));
  if (items.length === 0) return inv;
  if (!isServerId(inv.id)) throw new MediaUploadError(new Error(/* i18n-ignore */ '서버 id 가 없다'));

  let done = 0;
  let next = 0;
  let failure: unknown = null;
  deps.onProgress?.(0, items.length);
  const worker = async () => {
    while (next < items.length && failure === null) {
      const item = items[next];
      next += 1;
      try {
        await uploadOne(inv, item, deps);
        done += 1;
        deps.onProgress?.(done, items.length);
      } catch (e) {
        failure = failure ?? e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  if (failure !== null) throw new MediaUploadError(failure);

  return mapInvitationMedia(inv, (uri) => (isLocalMedia(uri) ? deps.uploaded.get(`${inv.id}|${uri}`)!.url : uri));
}

export type MediaUploader = (inv: Invitation, onProgress?: (done: number, total: number) => void) => Promise<Invitation>;

/**
 * 파일까지 포함한 저장 순서. mock(upload 없음)은 그대로 저장한다.
 * 새 초대장은 키에 넣을 id 가 없으므로, 기기 주소를 뺀 사본을 작성 중으로 먼저 저장해 id 를 받는다.
 * 그 뒤 올리기가 실패해도 onId 로 넘긴 id 가 초안에 남아, 다시 저장하면 같은 행을 고친다.
 */
export async function saveWithMedia(
  inv: Invitation,
  opts: {
    save: (inv: Invitation) => Promise<Invitation>;
    upload: MediaUploader | null | undefined;
    onId: (id: string) => void;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<Invitation> {
  if (!opts.upload || collectLocalMedia(inv).length === 0) return opts.save(inv);
  let current = inv;
  if (!isServerId(inv.id)) {
    const first = await opts.save({ ...stripLocalMedia(inv), status: 'draft' });
    opts.onId(first.id);
    current = { ...inv, id: first.id };
  }
  return opts.save(await opts.upload(current, opts.onProgress));
}
