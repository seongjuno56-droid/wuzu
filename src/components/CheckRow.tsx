import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

interface Props {
  checked: boolean;
  label: string;
  onToggle: () => void;
  emphasized?: boolean;
  /** 체크 행 아래에 펼쳐지는 본문 (약관 전문 등) */
  children?: ReactNode;
}

export function CheckRow({ checked, label, onToggle, emphasized, children }: Props) {
  return (
    <View style={[styles.card, emphasized && styles.emphasized, checked && emphasized && styles.emphasizedOn]}>
      <Pressable
        onPress={onToggle}
        style={styles.row}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <Ionicons
          name={checked ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={26}
          color={checked ? colors.primary : colors.borderStrong}
        />
        <Txt variant="bodyStrong" weight={emphasized ? 'bold' : 'semibold'} style={styles.label}>
          {label}
        </Txt>
      </Pressable>
      {children && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.bg },
  emphasized: { backgroundColor: colors.surface },
  emphasizedOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  label: { flex: 1 },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
