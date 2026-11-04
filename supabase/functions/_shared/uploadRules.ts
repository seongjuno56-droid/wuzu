/**
 * 파일 올리기 규칙. Deno(Edge Function)·앱·jest 가 함께 읽으므로 런타임 전용 코드를 넣지 않는다.
 * 상한의 원본: 앱 CANVAS_LIMITS(gif·video), LIMITS.bgmBytes. 값이 같은지 uploadRules.test.ts 가 검사한다.
 * 확장자는 여기 표에서만 정한다. 앱이 보낸 파일 이름은 키에 쓰지 않는다.
 */
const MB = 1024 * 1024;

const PHOTO_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export const UPLOAD_RULES = {
  image: { types: PHOTO_TYPES as Record<string, string>, maxBytes: 2 * MB },
  thumb: { types: PHOTO_TYPES as Record<string, string>, maxBytes: 2 * MB },
  // 카카오톡 미리보기는 JPG·PNG 만 읽는다는 답변이 있어 WebP 를 받지 않는다
  linkThumb: { types: { 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<string, string>, maxBytes: 2 * MB },
  gif: { types: { 'image/gif': 'gif' } as Record<string, string>, maxBytes: 5 * MB },
  video: { types: { 'video/mp4': 'mp4', 'video/quicktime': 'mov' } as Record<string, string>, maxBytes: 20 * MB },
  bgm: {
    types: { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/ogg': 'ogg' } as Record<string, string>,
    maxBytes: 5 * MB,
  },
};

export type UploadKind = keyof typeof UPLOAD_RULES;

const has = (o: object, k: unknown): k is string => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export function checkUpload(f: {
  kind: unknown;
  contentType: unknown;
  bytes: unknown;
}): { ok: true; ext: string } | { ok: false; reason: 'kind' | 'type' | 'size' } {
  if (!has(UPLOAD_RULES, f.kind)) return { ok: false, reason: 'kind' };
  const rule = UPLOAD_RULES[f.kind as UploadKind];
  if (!has(rule.types, f.contentType)) return { ok: false, reason: 'type' };
  if (typeof f.bytes !== 'number' || !Number.isInteger(f.bytes) || f.bytes <= 0 || f.bytes > rule.maxBytes) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true, ext: rule.types[f.contentType] };
}

/** 본 이미지의 키 → 작은 사진의 키. 앱과 서버가 같은 규칙으로 이름을 만든다 */
export const thumbKeyOf = (key: string) => key.replace(/(\.[a-z0-9]+)$/, '_thumb$1');
