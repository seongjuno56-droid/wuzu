import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

/** 처음 불러오기가 실패한 화면: 안내와 [다시 시도] */
export function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Txt color={colors.muted} align="center">
        {message}
      </Txt>
      <Button label="다시 시도" variant="outline" size="md" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl, marginTop: 80 },
});
