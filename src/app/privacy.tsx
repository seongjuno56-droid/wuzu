import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { TERMS_PRIVACY } from '../data/terms';
import { spacing } from '../theme';

/** 공개 웹의 개인정보 처리방침. 새 탭으로 열려 돌아갈 곳이 없으면 뒤로 버튼을 두지 않는다(앱 홈으로 나가지 않게) */
export default function PublicPrivacyScreen() {
  return (
    <Screen header={<Header title="개인정보 처리방침" hideBack={!router.canGoBack()} onBack={() => router.back()} />} contentStyle={styles.content}>
      <Txt>{TERMS_PRIVACY}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.xl } });
