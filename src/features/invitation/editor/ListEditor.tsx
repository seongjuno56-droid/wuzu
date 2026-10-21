import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { moveItem } from '../../../lib/sortable';
import { colors, radius, spacing } from '../../../theme';
import { removeItem } from './listOps';

/**
 * 목록형 입력: 항목 카드 + [+ 추가]. 순서는 ↑↓, 삭제는 ×.
 * (카드 높이가 내용마다 달라 끌어 옮기기 대신 버튼으로 순서를 바꾼다)
 */
export function ListEditor<T extends { id: string }>({
  items,
  max,
  addLabel,
  onAdd,
  onChange,
  renderItem,
}: {
  items: T[];
  max: number;
  addLabel: string;
  onAdd: () => void;
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const full = items.length >= max;
  const btn = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={name} size={18} color={disabled ? colors.placeholder : colors.inkSoft} />
    </Pressable>
  );
  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.head}>
            <Txt variant="caption" weight="semibold" color={colors.muted}>
              {String(i + 1)}
            </Txt>
            <View style={styles.actions}>
              {btn('arrow-up', '위로', () => onChange(moveItem(items, i, i - 1)), i === 0)}
              {btn('arrow-down', '아래로', () => onChange(moveItem(items, i, i + 1)), i === items.length - 1)}
              {btn('close', '삭제', () => onChange(removeItem(items, item.id)))}
            </View>
          </View>
          {renderItem(item, i)}
        </View>
      ))}
      <Pressable
        onPress={onAdd}
        disabled={full}
        style={[styles.add, full && styles.addOff]}
        accessibilityRole="button"
        accessibilityState={{ disabled: full }}
      >
        <Ionicons name="add" size={16} color={full ? colors.placeholder : colors.brand} />
        <Txt variant="caption" weight="semibold" color={full ? colors.placeholder : colors.brand}>
          {addLabel}
        </Txt>
      </Pressable>
      <Txt variant="tiny" color={colors.faint}>
        {`최대 ${max}개까지 넣을 수 있어요.`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.lg },
  add: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: 'dashed',
  },
  addOff: { borderColor: colors.hairline },
});
