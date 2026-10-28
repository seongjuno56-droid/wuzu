import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { toast } from '../../components/Toast';
import { checkAudioFile, checkImageFile } from './model';

const MAX_WIDTH = 1280;

/**
 * 서버가 없어 사진을 기기에 저장한다. 웹은 저장 용량 한도가 작아서
 * 긴 변 1280px·JPEG 70% 로 줄인 base64 로 보관한다.
 */
/** 저장 형식: 로고처럼 투명 배경이 필요한 PNG 는 PNG 그대로, 나머지는 JPEG */
export function saveFormatFor(
  f: { mimeType?: string | null; fileName?: string | null },
  keepPng: boolean,
): 'png' | 'jpeg' {
  const png = f.mimeType ? f.mimeType.toLowerCase() === 'image/png' : /.png$/i.test(f.fileName ?? '');
  return keepPng && png ? 'png' : 'jpeg';
}

async function shrink(asset: ImagePicker.ImagePickerAsset, keepPng = false): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
    const ref = await ctx.renderAsync();
    const web = Platform.OS === 'web';
    const png = saveFormatFor(asset, keepPng) === 'png';
    const result = await ref.saveAsync({ compress: 0.7, format: png ? SaveFormat.PNG : SaveFormat.JPEG, base64: web });
    return web && result.base64 ? `data:image/${png ? 'png' : 'jpeg'};base64,${result.base64}` : result.uri;
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
