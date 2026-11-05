import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { toast } from '../../components/Toast';
import { checkAudioFile, checkImageFile } from './model';

/** 긴 변 길이: 본 이미지, 작은 사진 */
export const PHOTO_MAX_SIDE = 1080;
export const THUMB_MAX_SIDE = 400;

export type PhotoFormat = 'webp' | 'jpeg' | 'png';

/** 저장 형식: 로고처럼 투명 배경이 필요한 PNG 는 PNG 그대로, 나머지는 WebP (저장하지 못하면 encodePhoto 가 JPEG 로 대체) */
export function saveFormatFor(
  f: { mimeType?: string | null; fileName?: string | null },
  keepPng: boolean,
): 'png' | 'webp' {
  const png = f.mimeType ? f.mimeType.toLowerCase() === 'image/png' : /.png$/i.test(f.fileName ?? '');
  return keepPng && png ? 'png' : 'webp';
}

const SAVE_FORMAT: Record<PhotoFormat, SaveFormat> = { webp: SaveFormat.WEBP, jpeg: SaveFormat.JPEG, png: SaveFormat.PNG };

/**
 * 긴 변을 maxSide 이하로 줄여 저장하고 파일 주소를 돌려준다(늘리지는 않는다). 웹은 파일이 없어 data URI 다.
 * WebP 를 저장하지 못하는 플랫폼은 JPEG 로 대체한다(설계 "확인 결과"). exact 면 대체하지 않고 던진다. 그 밖의 실패도 던진다.
 */
export async function encodePhoto(uri: string, opts: { maxSide: number; format: PhotoFormat; exact?: boolean }): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const ctx = ImageManipulator.manipulate(original);
  if (Math.max(original.width, original.height) > opts.maxSide) {
    ctx.resize(original.width >= original.height ? { width: opts.maxSide, height: null } : { width: null, height: opts.maxSide });
  }
  const ref = await ctx.renderAsync();
  const web = Platform.OS === 'web';
  const save = async (format: PhotoFormat) => {
    const result = await ref.saveAsync({ compress: 0.7, format: SAVE_FORMAT[format], base64: web });
    return web && result.base64 ? `data:image/${format};base64,${result.base64}` : result.uri;
  };
  if (opts.format !== 'webp' || opts.exact) return save(opts.format);
  try {
    return await save('webp');
  } catch {
    return save('jpeg');
  }
}

/** 올리기 직전에 다시 줄일 때 (원본이 남았거나 2MB 를 넘는 사진) */
export const compressPhoto = (uri: string) => encodePhoto(uri, { maxSide: PHOTO_MAX_SIDE, format: 'webp' });

/** 작은 사진. 주소를 본 이미지에서 만들므로 본 이미지와 같은 형식으로 만든다. 다른 형식으로 대체하면 내용과 형식 표시가 어긋나므로 실패시킨다 */
export function makePhotoThumb(uri: string, contentType: string): Promise<string> {
  const format: PhotoFormat = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpeg' : 'webp';
  return encodePhoto(uri, { maxSide: THUMB_MAX_SIDE, format, exact: true });
}

/** 링크 썸네일 크기. 카카오톡 미리보기가 WebP 를 못 읽을 수 있어 JPEG 만 쓴다 */
export const LINK_THUMB_WIDTH = 800;
export const LINK_THUMB_HEIGHT = 400;

/** 가운데 기준으로 2:1 로 잘라 800×400 JPEG 새 파일을 만든다. 작은 사진은 늘려서라도 크기를 맞춘다. 실패하면 던진다 */
export async function makeLinkThumb(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;
  const cropWidth = Math.min(width, height * 2);
  const cropHeight = Math.max(1, Math.round(cropWidth / 2));
  const ctx = ImageManipulator.manipulate(original);
  ctx.crop({
    originX: Math.floor((width - cropWidth) / 2),
    originY: Math.floor((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  });
  ctx.resize({ width: LINK_THUMB_WIDTH, height: LINK_THUMB_HEIGHT });
  const ref = await ctx.renderAsync();
  const web = Platform.OS === 'web';
  const result = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: web });
  return web && result.base64 ? `data:image/jpeg;base64,${result.base64}` : result.uri;
}

/** 고를 때 줄여 둔다. 변환하지 못하면 원본을 두고, 올릴 때 다시 줄인다 */
async function shrink(asset: ImagePicker.ImagePickerAsset, keepPng = false): Promise<string> {
  try {
    return await encodePhoto(asset.uri, { maxSide: PHOTO_MAX_SIDE, format: saveFormatFor(asset, keepPng) });
  } catch {
    return asset.uri;
  }
}

/** 사진 고르기 (최대 limit 장). jpg·jpeg·png 외에는 안내 후 제외. keepPng: 로고처럼 PNG 를 그대로 둔다 */
export async function pickImages(limit: number, opts: { keepPng?: boolean } = {}): Promise<string[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];
  const allowed = result.assets.filter((a) => checkImageFile(a));
  if (allowed.length < result.assets.length) toast('허용되지 않은 확장자입니다.');
  return Promise.all(allowed.slice(0, limit).map((a) => shrink(a, !!opts.keepPng)));
}

/** BGM 고르기. 확장자·용량 검사 후 { uri, name } */
export async function pickAudio(): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const file = result.assets[0];
  const check = checkAudioFile({ name: file.name, size: file.size });
  if (check === 'extension') {
    toast('지원하지 않는 확장자입니다.');
    return null;
  }
  if (check === 'size') {
    toast('5MB 이하로 업로드해주세요.');
    return null;
  }
  return { uri: file.uri, name: file.name };
}
