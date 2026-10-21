import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { fitSlide } from '../../canvas/model';
import { pageOrder } from '../model';
import { CoverSlide } from './CoverSlide';
import { FormSlide } from './FormSlide';
import { useLook } from './look';
import { GuestbookHandlers, PageContent, ViewInvitation } from './PageContent';
import { isTypingTarget, settledPageIndex, tapSide } from './storyNav';
import { useMouseSwipe } from './useMouseSwipe';

/** 이 폭 이상(폴드 펼침·태블릿·PC)에서는 좌우 화살표 버튼을 보인다 */
const WIDE = 600;

/**
 * 스토리형: 9:16 슬라이드를 한 장씩. 좌우로 밀거나 슬라이드 좌·우 1/3 을 눌러 넘긴다.
 * 슬라이드 안 버튼·스크롤은 각자 터치를 가져가므로 넘김이 일어나지 않는다.
 */
export function StoryInvitation({ invitation, ...handlers }: { invitation: ViewInvitation } & GuestbookHandlers) {
  const look = useLook();
  const pages = pageOrder(invitation.enabled, invitation.order);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const root = useRef<View>(null);
  /** 버튼·키로 넘기는 중인 목표 장 — 그 사이 지나치는 경계에서 번호를 바꾸지 않는다 */
  const target = useRef<number | null>(null);
  const slide = fitSlide(box.width, box.height);

  const go = (next: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, next));
    setIndex(i);
    target.current = i;
    setTimeout(() => (target.current = null), 800); // 넘김이 끊겨도 막히지 않게
    scroller.current?.scrollTo({ x: i * box.width, animated: true });
  };

  // 폴드를 접고 펴서 폭이 바뀌면 보던 장으로 다시 맞춘다
  useEffect(() => {
    scroller.current?.scrollTo({ x: index * box.width, animated: false });
    // index 는 넘길 때마다 바뀌므로 폭이 바뀔 때만 맞춘다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.width]);

  // 웹 키보드 ←/→
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return; // 방명록 입력 중 커서 이동
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // locationX 는 누른 안쪽 요소 기준이라(웹) 쓸 수 없다 — 화면 x 에서 슬라이드 왼쪽 끝을 뺀다
  // PC 마우스로 끌어 넘기기 (터치·트랙패드는 스크롤이 맡는다)
  const justDragged = useMouseSwipe(root, (step) => go(index + step));

  const onTap = (e: GestureResponderEvent) => {
    if (justDragged()) return; // 끈 뒤의 눌림은 탭이 아니다
    const pageX = e.nativeEvent.pageX;
    root.current?.measureInWindow((left) => {
      const side = tapSide(pageX - left - (box.width - slide.width) / 2, slide.width);
      if (side) go(index + side);
    });
  };

  // 웹은 onMomentumScrollEnd 가 없다 — 스크롤이 장 경계에 멈추면 번호를 맞춘다
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = settledPageIndex(e.nativeEvent.contentOffset.x, box.width, pages.length);
    if (i === null) return;
    if (target.current !== null) {
      if (i !== target.current) return;
      target.current = null;
    }
    if (i !== index) setIndex(i);
  };

  return (
    <View
      ref={root}
      style={[styles.flex, { backgroundColor: look.bg }]}
      onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
    >
      {box.width > 0 && (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / box.width))}
          onScroll={Platform.OS === 'web' ? onScroll : undefined}
          scrollEventThrottle={32}
        >
          {pages.map((page) => (
            <View key={page} style={[styles.page, { width: box.width, height: box.height }]}>
              <Pressable onPress={onTap} accessible={false}>
                {page === 'cover' ? (
                  <CoverSlide invitation={invitation} width={slide.width} />
                ) : (
                  <FormSlide width={slide.width} height={slide.height} background={look.bg}>
                    <PageContent page={page} invitation={invitation} {...handlers} />
                  </FormSlide>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 상단 페이지 막대 */}
      <View style={[styles.bars, { width: slide.width, left: (box.width - slide.width) / 2 }]} pointerEvents="none">
        {pages.map((p, i) => (
          <View key={p} style={[styles.bar, { backgroundColor: look.fg, opacity: i <= index ? 0.8 : 0.2 }]} />
        ))}
      </View>

      {box.width >= WIDE && (
        <>
          {index > 0 && (
            <Pressable style={[styles.arrow, { left: 16 }]} onPress={() => go(index - 1)} accessibilityLabel="이전 장">
              <Ionicons name="chevron-back" size={24} color="#111111" />
            </Pressable>
          )}
          {index < pages.length - 1 && (
            <Pressable style={[styles.arrow, { right: 16 }]} onPress={() => go(index + 1)} accessibilityLabel="다음 장">
              <Ionicons name="chevron-forward" size={24} color="#111111" />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  bars: { position: 'absolute', top: 10, flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  bar: { flex: 1, height: 2, borderRadius: 1 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
