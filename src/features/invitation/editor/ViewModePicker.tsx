import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import type { ViewMode } from '../../canvas/types';

const OPTIONS: { value: ViewMode; label: string; body: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'story', label: '스토리형', body: '한 장씩 넘겨 봐요', icon: 'albums-outline' },
  { value: 'scroll', label: '스크롤형', body: '아래로 이어서 봐요', icon: 'reorder-four-outline' },
];

/** 미리보기 상단 [스토리형][스크롤형] 전환 칩 */
export function ViewModeChips({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <View style={styles.chips}>
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Txt variant="caption" weight={on ? 'semibold' : 'regular'} color={on ? colors.canvas : colors.label}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 스타일 선택 모달: 두 카드 중 하나 고르기 */
export function ViewModeModal({
  visible,
  initial,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initial: ViewMode;
  confirmLabel: string;
  onConfirm: (mode: ViewMode) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState(initial);
  // 모달이 열릴 때 처음 값으로 맞춘다 (렌더 중 이전 값 비교)
  const [synced, setSynced] = useState({ visible, initial });
  if (synced.visible !== visible || synced.initial !== initial) {
    setSynced({ visible, initial });
    if (visible) setMode(initial);
  }

  return (
    <AppModal
      visible={visible}
      title="어떤 형태로 만들까요?"
      onDismiss={onCancel}
      actions={[
        { label: '취소', variant: 'outline', onPress: onCancel },
        { label: confirmLabel, onPress: () => onConfirm(mode) },
      ]}
    >
      <View style={styles.cards}>
        {OPTIONS.map((o) => {
          const on = o.value === mode;
          return (
            <Pressable
              key={o.value}
              onPress={() => setMode(o.value)}
              style={[styles.card, on && styles.cardOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={o.icon} size={28} color={on ? colors.brand : colors.faint} />
              <Txt variant="bodyStrong">{o.label}</Txt>
              <Txt variant="tiny" color={colors.muted} align="center">
                {o.body}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="tiny" color={colors.faint} align="center">
        만드는 중에도 바꿀 수 있어요.
      </Txt>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'center', paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cards: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardOn: { borderColor: colors.brand, backgroundColor: colors.brandTint },
});
