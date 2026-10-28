import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { toast } from '../../components/Toast';
import { IMAGE_EXTENSIONS } from '../invitation/model';
import { checkGif, checkVideo, isGifFile, needsSessionUrl } from './model';

const MAX_SIDE = 1280;

export type PickedVisual = { kind: 'image' | 'gif'; uri: string; aspect: number };

/** 웹: data URI 를 객체 URL 로 (저장 용량 보호, 새로고침하면 사라진다) */
export async function sessionUrl(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return URL.createObjectURL(blob);
}

/** 사진 압축 저장: 긴 변 1280px. 투명 PNG 는 PNG 유지, 나머지는 JPEG 70% */
export async function storeImage(uri: string, opts: { width: number; height: number; png: boolean }): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (Math.max(opts.width, opts.height) > MAX_SIDE) {
      ctx.resize(opts.width >= opts.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const ref = await ctx.renderAsync();
    const web = Platform.OS === 'web';
    const format = opts.png ? SaveFormat.PNG : SaveFormat.JPEG;
    const result = await ref.saveAsync({ compress: 0.7, format, base64: web });
    if (web && result.base64) return `data:image/${opts.png ? 'png' : 'jpeg'};base64,${result.base64}`;
    return result.uri;
  } catch {
    return uri;
  }
}

const extOf = (name?: string | null) => (name?.split('.').pop() ?? '').toLowerCase();

/** 앨범에서 사진 또는 GIF 한 장 */
export async function pickCanvasVisual(): Promise<PickedVisual | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
    // iOS 에서 GIF 가 JPEG 로 바뀌지 않게 원본 표현 유지
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (result.canceled || !result.assets.length) return null;
  const a = result.assets[0];
  const aspect = a.width && a.height ? a.height / a.width : 1;

  if (isGifFile({ name: a.fileName, mimeType: a.mimeType, uri: a.uri })) {
    if (checkGif({ size: a.fileSize })) {
      toast('GIF는 10MB 이하로 올려주세요.');
      return null;
    }
    // GIF 는 압축하면 움직임이 사라지므로 그대로 둔다
    const uri = needsSessionUrl('gif', a.uri, Platform.OS) ? await sessionUrl(a.uri) : a.uri;
    return { kind: 'gif', uri, aspect };
  }

  const ext = extOf(a.fileName) || (a.mimeType?.split('/')[1] ?? '');
  if (ext && !IMAGE_EXTENSIONS.includes(ext) && !a.mimeType?.startsWith('image/')) {
    toast('허용되지 않은 확장자입니다.');
    return null;
  }
  const png = ext === 'png' || a.mimeType === 'image/png';
  return { kind: 'image', uri: await storeImage(a.uri, { width: a.width, height: a.height, png }), aspect };
}

/** 앨범에서 동영상 한 개 (15초·30MB·mp4/mov) */
export async function pickCanvasVideo(): Promise<{ uri: string; aspect: number; durationMs: number } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false });
  if (result.canceled || !result.assets.length) return null;
  const a = result.assets[0];
  const check = checkVideo({ name: a.fileName, mimeType: a.mimeType, size: a.fileSize, durationMs: a.duration });
  if (check === 'extension') {
    toast('mp4·mov 영상만 올릴 수 있어요.');
    return null;
  }
  if (check === 'duration') {
    toast('15초 이하 영상만 올릴 수 있어요.');
    return null;
  }
  if (check === 'size') {
    toast('30MB 이하로 올려주세요.');
    return null;
  }
  const uri = needsSessionUrl('video', a.uri, Platform.OS) ? await sessionUrl(a.uri) : a.uri;
  return { uri, aspect: a.width && a.height ? a.height / a.width : 9 / 16, durationMs: a.duration ?? 0 };
}
