import { StyleSheet } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { TERMS_SERVICE } from '../../data/terms';
import { spacing } from '../../theme';

/** 서비스 이용약관 */
export default function TermsScreen() {
  return (
    <Screen header={<Header title="서비스 이용약관" />} contentStyle={styles.content}>
      <Txt>{TERMS_SERVICE}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.xl } });
