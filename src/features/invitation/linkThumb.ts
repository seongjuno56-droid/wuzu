import * as ImagePicker from 'expo-image-picker';

import { toast } from '../../components/Toast';
import { isLocalMedia } from '../../services/media/localMedia';
import { withTimeout } from '../../services/withTimeout';
import { resolvePhoto } from '../canvas/model';
import { makeLinkThumb } from './media';
import { checkImageFile, Invitation, isCorporate } from './model';

/**
 * 링크 썸네일 (설계 7장).
 * 직접 올린 값: linkThumb 만 있다. 대체 이미지: content.linkThumbSource 에 만든 원본 사진 주소가 함께 있다.
 * 표시를 content 에 두는 까닭: 주소를 바꾸는 mapInvitationMedia 가 사진과 똑같이 바꿔 주어, 올린 뒤에도 원본 사진과 비교할 수 있고 서버에도 그대로 저장된다.
 */

/** 만드는 동안 저장 화면이 멈춰 있으므로 오래 기다리지 않는다. 시간이 지나면 썸네일 없이 저장한다 */
const MAKE_TIMEOUT_MS = 15_000;

/** 직접 올린 썸네일. 없거나 대체 이미지면 null */
export function userLinkThumb(inv: Invitation): string | null {
  return inv.content.linkThumbSource ? null : (inv.linkThumb ?? null);
}

/**
 * 대체 이미지의 원본: 대표 사진 → 인사말 사진 → 갤러리 첫 장. 없으면 null(서버·웹이 wuzu 기본 이미지를 쓴다).
 * 대표 사진은 돌잔치·모임에만 있다. 기업은 갤러리가 없고, 로고는 사진이 아니라 쓰지 않는다.
 * 꺼 둔 갤러리의 사진은 하객에게 보이지 않으므로 쓰지 않는다.
 */
export function linkThumbFallback(inv: Invitation): string | null {
  const c = inv.content;
  const representative = resolvePhoto(c);
  if (representative) return representative;
  if (c.greeting.photo) return c.greeting.photo;
  if (isCorporate(c) || !inv.enabled.gallery) return null;
  return c.gallery.photos[0] ?? null;
}

/** 대체 이미지 값을 바꾼 사본. 없으면 표시도 함께 지운다 */
function withFallback(inv: Invitation, thumb: string | null, source: string | null): Invitation {
  const { linkThumbSource: _old, ...rest } = inv.content;
  const content = (source ? { ...rest, linkThumbSource: source } : rest) as Invitation['content'];
  return { ...inv, linkThumb: thumb, content };
}

/** 마지막으로 만든 파일. 올리기가 실패해 다시 저장할 때 새 파일을 또 만들어 또 올리지 않게 한다 */
let lastMade: { source: string; uri: string } | null = null;

async function makeFallback(source: string): Promise<string | null> {
  if (lastMade?.source === source) return lastMade.uri;
  try {
    const uri = await withTimeout(() => makeLinkThumb(source), MAKE_TIMEOUT_MS);
    lastMade = { source, uri };
    return uri;
  } catch {
    return null;
  }
}

/**
 * 저장 직전에 대체 이미지를 맞춘다. 던지지 않는다: 썸네일 때문에 저장이 실패하면 안 된다.
 * - 직접 올린 값은 건드리지 않는다.
 * - 원본 사진이 그대로면 그대로 둔다(새 파일은 곧 새 업로드다).
 * - 원본이 바뀌었으면 다시 만들고, 사진이 없거나 만들 수 없으면 옛 사진의 이미지를 남기지 않고 null 로 둔다.
 * - 원본이 이미 서버 주소면(다른 기기에서 고친 경우 등) 내려받지 않고 건너뛴다. 변환 모듈 문서가 기기 파일만 약속하기 때문이다.
 */
export async function prepareLinkThumb(inv: Invitation): Promise<Invitation> {
  const current = inv.linkThumb ?? null;
  const marker = inv.content.linkThumbSource ?? null;
  if (current && !marker) return inv;

  const source = linkThumbFallback(inv);
  if (source && current && marker === source) return inv;

  const made = source && isLocalMedia(source) ? await makeFallback(source) : null;
  if (made) return withFallback(inv, made, source);
  return current || marker ? withFallback(inv, null, null) : inv;
}

/** 이미지를 골라 가운데 기준 2:1 로 잘라 800×400 JPEG 로 만든다. 취소·허용되지 않은 형식·변환 실패는 null */
export async function pickLinkThumb(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  if (!checkImageFile(asset)) {
    toast('허용되지 않은 확장자입니다.');
    return null;
  }
  try {
    return await makeLinkThumb(asset.uri);
  } catch {
    toast('이미지를 불러오지 못했어요. 다른 이미지를 골라 주세요.');
    return null;
  }
}
