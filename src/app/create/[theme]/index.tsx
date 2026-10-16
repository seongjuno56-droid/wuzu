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
const CARD_ASPECT = 0.62; // 카드 가로/세로
const GAP = spacing.md;

export default function TemplateSelect() {
  const { theme: themeId } = useLocalSearchParams<{ theme: string }>();
  const theme = getTheme(themeId);
  const templates = getTemplates(themeId);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<InviteTemplate>>(null);
  const { start, modal } = useRequireLoginToCreate();

  if (!theme) return <Redirect href="/create" />;

  // 폭과 높이 둘 다에 맞춰 카드 크기를 정한다 (넓은 웹 화면에서도 잘리지 않게)
  const cardWidth = Math.min(size.w * CARD_RATIO, (size.h - 32) * CARD_ASPECT);
  const interval = cardWidth + GAP;
  const sidePadding = (size.w - cardWidth) / 2;

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
    <Screen scroll={false} header={<Header title={theme.title} />} background={colors.surface}>
      <View style={styles.titleRow}>
        <Txt variant="title">템플릿 선택</Txt>
        <Txt variant="caption" color={colors.faint}>
          <Txt variant="caption" weight="semibold" color={colors.inkSoft}>
            {index + 1}
          </Txt>{' '}
          / {templates.length}
        </Txt>
      </View>

      <View
        style={styles.carousel}
        onLayout={(e: LayoutChangeEvent) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {size.w > 0 && (
          <FlatList
            ref={listRef}
            data={templates}
            keyExtractor={(t) => t.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: sidePadding, gap: GAP, alignItems: 'center' }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item, index: i }) => (
              <Pressable
                onPress={() => (i === index ? router.push(`/create/${themeId}/${item.id}`) : goTo(i))}
                accessibilityLabel={`${item.name} 템플릿`}
                style={[
                  styles.card,
                  shadow,
                  { width: cardWidth, height: cardWidth / CARD_ASPECT, opacity: i === index ? 1 : 0.5 },
                ]}
              >
                <TemplatePreview template={item} coverOnly />
              </Pressable>
            )}
          />
        )}
        <Pressable
          style={[styles.arrow, shadow, styles.left]}
          onPress={() => goTo(index - 1)}
          accessibilityRole="button"
          accessibilityLabel="이전 템플릿"
        >
          <Ionicons name="chevron-back" size={20} color={colors.inkSoft} />
        </Pressable>
        <Pressable
          style={[styles.arrow, shadow, styles.right]}
          onPress={() => goTo(index + 1)}
          accessibilityRole="button"
          accessibilityLabel="다음 템플릿"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Txt variant="bodyStrong" align="center">
          {current?.name}
        </Txt>
        <View style={styles.actions}>
          <Button
            label="미리보기"
            variant="outline"
            style={styles.flex}
            onPress={() => router.push(`/create/${themeId}/${current.id}`)}
          />
          <Button label="이 템플릿으로 만들기" style={styles.wide} onPress={() => start(themeId, current.id, current.name)} />
        </View>
      </View>
      {modal}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wide: { flex: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  carousel: { flex: 1, justifyContent: 'center' },
  card: { borderRadius: radius.xl, backgroundColor: colors.canvas, overflow: 'hidden' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { left: spacing.md },
  right: { right: spacing.md },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
