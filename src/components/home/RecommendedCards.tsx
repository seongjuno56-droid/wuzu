import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getTemplates } from '../../data/templates';
import { InviteTheme, THEMES } from '../../data/themes';
import { colors, radius, spacing } from '../../theme';
import { ThemeArt } from '../ThemeTile';
import { Txt } from '../Txt';

/**
 * 'WUZU가 추천하는 초대장' 카드 — 썸네일·이름·해시태그, 누르면 연결된 템플릿 미리보기로.
 * (관리자 등록 콘텐츠가 생기기 전까지 테마별 대표 템플릿을 추천으로 보여준다)
 */
function RecommendCard({ theme }: { theme: InviteTheme }) {
  const [width, setWidth] = useState(0);
  const template = getTemplates(theme.id)[0];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/create/${theme.id}/${template.id}`)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel={`${theme.title} 미리보기`}
    >
      {width > 0 && <ThemeArt theme={theme} size={width - spacing.md * 2} />}
      <View style={styles.text}>
        <Txt variant="caption" weight="semibold" numberOfLines={1}>
          {theme.title}
        </Txt>
        <Txt variant="tiny" color={colors.faint} numberOfLines={1}>
          {theme.tags.join(' ')}
        </Txt>
      </View>
    </Pressable>
  );
}

export function RecommendedCards() {
  return (
    <View style={styles.grid}>
      {[0, 2].map((row) => (
        <View key={row} style={styles.row}>
          {THEMES.slice(row, row + 2).map((t) => (
            <RecommendCard key={t.id} theme={t} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  pressed: { backgroundColor: colors.surface },
  text: { gap: 2 },
});
