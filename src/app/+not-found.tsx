import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { colors, spacing } from '../theme';

/** 없는 주소로 들어왔을 때 (잘못된 링크 등) */
export default function NotFound() {
  return (
    <Screen header={<Header title="wuzu" />} contentStyle={styles.body}>
      <Txt variant="title" align="center">
        페이지를 찾을 수 없어요
      </Txt>
      <Txt variant="caption" color={colors.muted} align="center">
        삭제되었거나 주소가 잘못되었어요.
      </Txt>
      <Button label="홈으로" onPress={() => router.replace('/home')} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  button: { marginTop: spacing.lg },
});
