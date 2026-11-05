import type { SupabaseClient } from '@supabase/supabase-js';

import { compressPhoto, makePhotoThumb } from '../../features/invitation/media';
import { mediaUrlOfKey } from '../media/mediaRef';
import { type MediaUploader, type SignedUpload, type UploadedFile, uploadDraftMedia } from '../media/uploadDraftMedia';

/**
 * 실제 올리기 연결: Edge Function 에서 서명 주소를 받아 R2 로 직접 PUT.
 * 기기의 file:·content: 와 웹의 data:·blob: 를 fetch 한 벌로 읽는다. 실기기 확인은 Task 11.
 */
export function createMediaUploader(client: SupabaseClient): MediaUploader {
  // 앱이 켜져 있는 동안 유지한다. 초안도 메모리에만 있으므로 수명이 같다
  const uploaded = new Map<string, UploadedFile>();

  return (inv, onProgress) =>
    uploadDraftMedia(inv, {
      uploaded,
      onProgress,
      async sign(request) {
        const { data, error } = await client.functions.invoke<SignedUpload>('sign-upload', { body: request });
        if (error || !data) throw error ?? new Error('sign-upload');
        return data;
      },
      async read(uri) {
        const body = await (await fetch(uri)).blob();
        return { body, type: body.type, bytes: body.size };
      },
      async put(url, headers, body, signal) {
        // 안드로이드는 Blob 자신의 형식이 content-type 헤더를 덮어쓴다. 서명한 형식과 다르면 R2 가 언제나 403 으로 거절하므로 맞춘다
        const typed = body.slice(0, body.size, headers['content-type']);
        const r = await fetch(url, { method: 'PUT', headers, body: typed, signal });
        if (!r.ok) throw new Error(`put_${r.status}`);
      },
      recompress: compressPhoto,
      makeThumb: makePhotoThumb,
      publicUrl: mediaUrlOfKey,
    });
}
