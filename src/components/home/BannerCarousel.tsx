import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { BANNERS } from '../../data/home';
import { settledPageIndex } from '../../features/invitation/view/storyNav';
import { useMouseSwipe } from '../../features/invitation/view/useMouseSwipe';
import { radius, spacing } from '../../theme';
import { Icon3D } from '../brand/Icon3D';
import { Txt } from '../Txt';

const AUTO_MS = 4500;
/** 손을 뗀 뒤 자동 넘김을 다시 시작하기까지 */
const RESUME_MS = 6000;
const HEIGHT = 180;

/**
 * 홈 상단 배너: 좌우로 밀어 넘기는 캐러셀 (손가락·트랙패드·PC 마우스 끌기).
 * 4.5초마다 자동으로 넘기고, 만지는 동안과 손을 뗀 직후에는 멈춘다. 마지막 장 다음은 첫 장.
 * 카드 색과 3D 일러스트가 '이미지' 역할 (16px 반경).
 */
export function BannerCarousel() {
  const total = BANNERS.length;
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const root = useRef<View>(null);
  const scroller = useRef<ScrollView>(null);
  /** 이 시각까지는 자동 넘김을 쉰다 */
  const pausedUntil = useRef(0);

  const goTo = (i: number, animated = true) => {
    const next = ((i % total) + total) % total;
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated });
  };
  const pause = () => (pausedUntil.current = Date.now() + RESUME_MS);

  useEffect(() => {
    if (!width) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const next = (index + 1) % total;
      setIndex(next);
      scroller.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [index, total, width]);

  // PC 마우스로 끌어 넘기기 (브라우저는 마우스 끌기를 가로 스크롤로 처리하지 않는다)
  useMouseSwipe({
    root,
    scroller,
    pageWidth: width,
    count: total,
    onRelease: (page) => {
      pause();
      goTo(page);
    },
  });

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = settledPageIndex(e.nativeEvent.contentOffset.x, width, total);
    if (i !== null && i !== index) setIndex(i);
  };

  const b = BANNERS[index];
  return (
    <View
      ref={root}
      style={styles.frame}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessibilityRole="adjustable"
      accessibilityLabel={`${b.title.replace('\n', ' ')}, ${index + 1}/${total}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => goTo(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
    >
      {width > 0 && (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={pause}
          onMomentumScrollEnd={onSettle}
          // 웹은 onMomentumScrollEnd 가 없어 스크롤이 장 경계에 멈출 때 번호를 맞춘다
          onScroll={Platform.OS === 'web' ? onSettle : undefined}
          scrollEventThrottle={32}
        >
          {BANNERS.map((item) => (
            <View key={item.id} style={[styles.banner, { width, backgroundColor: item.bg }]}>
              <View style={styles.text}>
                <Txt variant="headline" color={item.fg}>
                  {item.title}
                </Txt>
                <Txt variant="caption" color={item.fg} style={styles.body}>
                  {item.body}
                </Txt>
              </View>
              <Icon3D name={item.art} size={112} style={styles.art} />
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.counter} pointerEvents="none">
        <Txt variant="tiny" color="#fff">
          {index + 1} / {total}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: HEIGHT, borderRadius: radius.xl, overflow: 'hidden' },
  banner: { height: HEIGHT, padding: spacing.xl },
  text: { gap: spacing.xs },
  body: { opacity: 0.7 },
  art: { position: 'absolute', right: 20, bottom: 18 },
  counter: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
