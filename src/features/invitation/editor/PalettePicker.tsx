import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { palettesFor } from '../../../data/templates';
import { colors, spacing } from '../../../theme';

const SWATCH = 44;

/** 상단 보조 줄 [색상] 칩 옆 점: 지금 배경색 */
export function PaletteDot({ bg, accent }: { bg: string; accent: string }) {
  return (
    <View style={[styles.dot, { backgroundColor: bg }]}>
      <View style={[styles.dotInner, { backgroundColor: accent }]} />
    </View>
  );
}

/**
 * 배경 색 조합 고르기. 누르면 바로 적용하고 닫는다.
 * 각 조합은 배경·글자·포인트 색이 함께라 어두운 배경에서도 글자가 읽힌다.
 */
export function PaletteModal({
  visible,
  themeId,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  /** 테마마다 색 조합이 다르다 (돌잔치는 파스텔 10색) */
  themeId: string;
  /** 지금 조합 id (템플릿 색이면 템플릿의 조합 id) */
  value: string | undefined;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <AppModal
      visible={visible}
      title="배경 색상"
      message="글자·포인트 색도 함께 어울리게 바뀌어요."
      onDismiss={onClose}
      actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}
    >
      <View style={styles.grid}>
        {palettesFor(themeId).map((p) => {
          const on = p.id === value;
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.name}
            >
              <View style={[styles.ring, on && styles.ringOn]}>
                <View style={[styles.swatch, { backgroundColor: p.bg }]}>
                  {on ? (
                    <Ionicons name="checkmark" size={20} color={p.fg} />
                  ) : (
                    <View style={[styles.accent, { backgroundColor: p.accent }]} />
                  )}
                </View>
              </View>
              <Txt variant="tiny" color={on ? colors.brand : colors.muted} weight={on ? 'semibold' : 'regular'}>
                {p.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.md, columnGap: spacing.sm },
  cell: { alignItems: 'center', gap: 4, width: 52 },
  ring: { padding: 2, borderRadius: SWATCH, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.brand },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accent: { width: 12, height: 12, borderRadius: 6 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 6, height: 6, borderRadius: 3 },
});
