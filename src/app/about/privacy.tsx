import { StyleSheet } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { TERMS_PRIVACY } from '../../data/terms';
import { spacing } from '../../theme';

/** 개인정보 처리방침 */
export default function PrivacyScreen() {
  return (
    <Screen header={<Header title="개인정보 처리방침" />} contentStyle={styles.content}>
      <Txt>{TERMS_PRIVACY}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.xl } });
