import * as Clipboard from 'expo-clipboard';
import { Image as RNImage, Platform } from 'react-native';

import { checkGif, isGifFile, textForPaste } from './model';
import { storeImage } from './media';

export type PasteResult =
  | { kind: 'image' | 'gif'; uri: string; aspect: number }
  | { kind: 'text'; text: string }
  | { kind: 'empty' }
  | { kind: 'unsupported' }
  | { kind: 'tooLarge' };

const sizeOf = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve) =>
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), () => resolve({ width: 1, height: 1 })),
  );

/** 웹 파일(Blob) → 붙여넣기 결과. GIF 는 객체 URL 그대로, 사진은 JPEG 로 압축 (스크린샷 PNG 는 웹 저장 용량을 넘긴다) */
async function fromBlob(file: Blob): Promise<PasteResult> {
  if (isGifFile({ mimeType: file.type })) {
    if (checkGif({ size: file.size })) return { kind: 'tooLarge' };
    const uri = URL.createObjectURL(file);
    const { width, height } = await sizeOf(uri);
    return { kind: 'gif', uri, aspect: height / width };
  }
  const raw = URL.createObjectURL(file);
  const { width, height } = await sizeOf(raw);
  const uri = await storeImage(raw, { width, height, png: false });
  // 압축본을 따로 만들었으면 원본 객체 URL 은 정리
  if (uri !== raw) URL.revokeObjectURL(raw);
  return { kind: 'image', uri, aspect: height / width };
}

/** [붙여넣기] 버튼: 이미지 → 텍스트 순으로 확인 */
export async function readClipboard(): Promise<PasteResult> {
  if (Platform.OS === 'web') {
    // expo-clipboard 의 Clipboard 와 이름이 겹치지 않게 브라우저 API 를 직접 쓴다
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clip || !('read' in clip)) return { kind: 'unsupported' };
    try {
      const items = await clip.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) return fromBlob(await item.getType(type));
      }
      const text = textForPaste(await navigator.clipboard.readText());
      return text ? { kind: 'text', text } : { kind: 'empty' };
    } catch {
      // 권한 거부·브라우저 미지원
      return { kind: 'unsupported' };
    }
  }

  if (await Clipboard.hasImageAsync()) {
    const img = await Clipboard.getImageAsync({ format: 'jpeg' });
    if (img) {
      const { width, height } = img.size;
      const uri = await storeImage(img.data, { width, height, png: false });
      return { kind: 'image', uri, aspect: height / width };
    }
  }
  // iOS 는 권한 거부와 빈 클립보드를 구분할 수 없다 — 둘 다 '비었음' 안내
  const text = textForPaste(await Clipboard.getStringAsync());
  return text ? { kind: 'text', text } : { kind: 'empty' };
}

/** 웹 Ctrl+V: 파일(GIF 포함) → 텍스트 */
export async function fromPasteEvent(e: ClipboardEvent): Promise<PasteResult> {
  const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
  if (file) return fromBlob(file);
  const text = textForPaste(e.clipboardData?.getData('text/plain') ?? '');
  return text ? { kind: 'text', text } : { kind: 'empty' };
}

export const PASTE_MESSAGE = {
  empty: '붙여넣을 내용이 없어요.',
  unsupported: 'Ctrl+V로 붙여넣어 주세요.',
  tooLarge: 'GIF는 10MB 이하로 올려주세요.',
} as const;
