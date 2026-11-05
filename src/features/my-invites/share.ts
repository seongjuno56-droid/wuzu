import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { toast } from '../../components/Toast';
import { usingMockAuth } from '../../services';
import type { Invitation } from '../invitation/model';

/** 앱 안에서 여는 주소. mock 에는 하객 웹이 없어 이 주소로 공유한다 */
export function invitationUrl(id: string): string {
  if (Platform.OS === 'web') return `${window.location.origin}/invite/${id}`;
  return Linking.createURL(`/invite/${id}`);
}

/** 하객 웹 주소. 활성화 전이라 slug 가 없거나 웹 주소 설정이 없으면 null */
export function guestUrl(inv: Invitation): string | null {
  // EXPO_PUBLIC_* 는 빌드 때 그대로 박히므로 process.env.이름 으로 직접 읽어야 한다
  const base = process.env.EXPO_PUBLIC_GUEST_WEB_URL?.trim().replace(/\/+$/, '');
  if (!inv.slug || !base) return null;
  return `${base}/i/${inv.slug}`;
}

/**
 * 앱: 기기 공유 시트 / 웹: 주소 복사. 실패는 여기서 안내하고 던지지 않는다.
 * mock 은 usingMockAuth 로 가른다: 실서버 빌드에 웹 주소가 빠졌을 때 앱 전용 주소가 하객에게 나가면 안 된다.
 */
export async function shareInvitation(inv: Invitation): Promise<void> {
  const url = usingMockAuth ? invitationUrl(inv.id) : guestUrl(inv);
  if (!url) {
    toast('공유 주소를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    return;
  }
  try {
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(url);
      toast('주소를 복사했어요.');
      return;
    }
    await Share.share({ message: `${inv.name}\n${url}` });
  } catch {
    toast('공유하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}
