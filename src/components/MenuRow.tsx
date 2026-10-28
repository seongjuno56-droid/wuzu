import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Txt } from './Txt';

/** 줄 메뉴: 왼쪽 라벨, 오른쪽 값/› */
export function MenuRow({ label, onPress, muted, right }: { label: string; onPress?: () => void; muted?: boolean; right?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, muted && styles.muted, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Txt variant="subtitle" color={colors.label} style={styles.flex}>
        {label}
      </Txt>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />)}
    </Pressable>
  );
}

/** 메뉴 묶음 사이 간격 */
export const MenuGap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  muted: { backgroundColor: colors.surface },
  pressed: { opacity: 0.7 },
  gap: { height: spacing.sm },
});
