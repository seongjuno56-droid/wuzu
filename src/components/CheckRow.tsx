import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

interface Props {
  checked: boolean;
  label: string;
  onToggle: () => void;
  /** 전체 동의처럼 강조되는 행 */
  emphasized?: boolean;
  /** 필수/선택 표시 */
  tag?: '필수' | '선택';
  /** 체크 행 아래에 펼쳐지는 본문 (약관 전문 등) */
  children?: ReactNode;
}

export function CheckRow({ checked, label, onToggle, emphasized, tag, children }: Props) {
  return (
    <View style={emphasized && styles.allBox}>
      <Pressable
        onPress={onToggle}
        style={styles.row}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked && <Ionicons name="checkmark" size={15} color={colors.canvas} />}
        </View>
        <Txt variant={emphasized ? 'bodyStrong' : 'body'} style={styles.label}>
          {tag && (
            <Txt variant={emphasized ? 'bodyStrong' : 'body'} color={tag === '필수' ? colors.infoInk : colors.faint}>
              [{tag}]{' '}
            </Txt>
          )}
          {label}
        </Txt>
      </Pressable>
      {children && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  allBox: { borderRadius: radius.sm, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  label: { flex: 1 },
  body: {
    marginLeft: 50,
    marginRight: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
