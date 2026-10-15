import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { InviteTheme } from '../data/themes';
import { colors, radius, shadow, spacing } from '../theme';
import { Stamp } from './brand/Stamp';
import { Txt } from './Txt';

/** 테마 '이미지': 색은 여기서만 — 파스텔 바탕 위 기울어진 우표 */
export function ThemeArt({ theme, size }: { theme: InviteTheme; size: number }) {
  const sw = Math.round(size * 0.46);
  return (
    <View style={[styles.art, { width: size, height: size, backgroundColor: theme.tintSoft }]}>
      <Stamp width={sw} height={Math.round(sw * 1.22)} color={theme.tint} backdrop={theme.tintSoft} rotate={8}>
        <Ionicons name={theme.icon} size={Math.round(sw * 0.45)} color="#fff" />
      </Stamp>
    </View>
  );
}

/** 카테고리 타일 (흰 바탕, 헤어라인, 12px 반경) — 홈 4열 */
export function ThemeTile({ theme, onPress, style }: { theme: InviteTheme; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={theme.title}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, style]}
    >
      <ThemeArt theme={theme} size={60} />
      <Txt variant="caption" weight="semibold" align="center" numberOfLines={1}>
        {theme.label}
      </Txt>
    </Pressable>
  );
}

/** 랭킹 카드형 행 (흰 카드, 8px 반경, 카드 그림자) — 테마 선택 화면 */
export function ThemeRow({ theme, onPress }: { theme: InviteTheme; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={theme.title}
      style={({ pressed }) => [styles.row, shadow, pressed && styles.pressed]}
    >
      <ThemeArt theme={theme} size={80} />
      <View style={styles.rowText}>
        <Txt variant="bodyStrong">{theme.title}</Txt>
        <Txt variant="caption" color={colors.muted}>
          {theme.description}
        </Txt>
        <Txt variant="tiny" color={colors.faint}>
          {theme.tags.join(' ')}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  pressed: { backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
  },
  rowText: { flex: 1, gap: 2 },
});
