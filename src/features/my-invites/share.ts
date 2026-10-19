import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { toast } from '../../components/Toast';
import type { Invitation } from '../invitation/model';

/** 하객 보기 주소 (실제 공유 도메인은 서버 단계) */
export function invitationUrl(id: string): string {
  if (Platform.OS === 'web') return `${window.location.origin}/invite/${id}`;
  return Linking.createURL(`/invite/${id}`);
}

/** 앱: 기기 공유 시트 / 웹: 주소 복사 */
export async function shareInvitation(inv: Invitation): Promise<void> {
  const url = invitationUrl(inv.id);
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(url);
    toast('주소를 복사했어요.');
    return;
  }
  await Share.share({ message: `${inv.name}\n${url}` });
}
