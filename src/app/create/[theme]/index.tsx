import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { TemplatePreview } from '../../../components/TemplatePreview';
import { Txt } from '../../../components/Txt';
import { getTemplates, InviteTemplate } from '../../../data/templates';
import { getTheme } from '../../../data/themes';
import { useRequireLoginToCreate } from '../../../features/create/useRequireLoginToCreate';
import { colors, radius, shadow, spacing } from '../../../theme';

const CARD_RATIO = 0.72; // 화면 폭 대비 카드 폭
const GAP = spacing.md;

export default function TemplateSelect() {
  const { theme: themeId } = useLocalSearchParams<{ theme: string }>();
  const theme = getTheme(themeId);
  const templates = getTemplates(themeId);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<InviteTemplate>>(null);
  const { start, modal } = useRequireLoginToCreate();

  if (!theme) return <Redirect href="/create" />;

  const cardWidth = width * CARD_RATIO;
  const interval = cardWidth + GAP;
  const sidePadding = (width - cardWidth) / 2;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(templates.length - 1, i));
    setIndex(next);
    listRef.current?.scrollToOffset({ offset: next * interval, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!interval) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / interval);
    if (i !== index && i >= 0 && i < templates.length) setIndex(i);
  };

  const current = templates[index];

  return (
    <Screen scroll={false} header={<Header title={theme.label} />} background={colors.surface}>
      <View style={styles.titleRow}>
        <Txt variant="bodyStrong" weight="bold">
          템플릿 선택
        </Txt>
        <Txt variant="bodyStrong" weight="bold" color={colors.primary}>
          {index + 1}/{templates.length}
        </Txt>
      </View>

      <View style={styles.carousel} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <FlatList
            ref={listRef}
            data={templates}
            keyExtractor={(t) => t.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: sidePadding, gap: GAP }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item, index: i }) => (
              <Pressable
                onPress={() => (i === index ? router.push(`/create/${themeId}/${item.id}`) : goTo(i))}
                style={[styles.card, shadow, { width: cardWidth, opacity: i === index ? 1 : 0.55 }]}
              >
                <View style={styles.cardPreview}>
                  <TemplatePreview template={item} coverOnly />
                </View>
              </Pressable>
            )}
          />
        )}
        <Pressable style={[styles.arrow, styles.left]} onPress={() => goTo(index - 1)} accessibilityRole="button" accessibilityLabel="이전 템플릿">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={[styles.arrow, styles.right]} onPress={() => goTo(index + 1)} accessibilityRole="button" accessibilityLabel="다음 템플릿">
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Txt variant="subtitle" weight="bold" align="center">
          {current?.name}
        </Txt>
        <View style={styles.actions}>
          <Button
            label="미리보기"
            variant="outline"
            style={styles.flex}
            onPress={() => router.push(`/create/${themeId}/${current.id}`)}
          />
          <Button label="선택하기" style={styles.flex} onPress={() => start(current.name)} />
        </View>
      </View>
      {modal}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  carousel: { flex: 1, justifyContent: 'center' },
  card: {
    alignSelf: 'center',
    aspectRatio: 0.62,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  cardPreview: { flex: 1 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { left: spacing.sm },
  right: { right: spacing.sm },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
