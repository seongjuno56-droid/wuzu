import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Txt } from './Txt';

/** 가입 단계 표시: 얇은 진행 막대 + "2/4" */
export function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={`${total}단계 중 ${current}단계`}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(current / total) * 100}%` }]} />
      </View>
      <Txt variant="tiny" color={colors.faint}>
        <Txt variant="tiny" weight="semibold" color={colors.inkSoft}>
          {current}
        </Txt>
        /{total}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  track: { flex: 1, height: 2, backgroundColor: colors.hairline, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2, backgroundColor: colors.inkSoft },
});
