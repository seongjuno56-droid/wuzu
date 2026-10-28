import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { Header } from '../../components/Header';
import { MenuRow } from '../../components/MenuRow';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { STORE_URLS } from '../../config';
import { colors } from '../../theme';

/** WUZU 정보: 버전(누르면 스토어) / 공지사항 / 서비스 이용약관 / 개인정보 처리방침 */
export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen header={<Header title="WUZU 정보" />}>
      <MenuRow
        label="버전"
        onPress={() => Linking.openURL(Platform.OS === 'android' ? STORE_URLS.android : STORE_URLS.ios)}
        right={<Txt color={colors.muted}>{version}</Txt>}
      />
      <MenuRow label="공지사항" onPress={() => router.push('/about/notices')} />
      <MenuRow label="서비스 이용약관" onPress={() => router.push('/about/terms')} />
      <MenuRow label="개인정보 처리방침" onPress={() => router.push('/about/privacy')} />
    </Screen>
  );
}
