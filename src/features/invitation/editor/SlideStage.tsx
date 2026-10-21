import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fitSlide } from '../../canvas/model';
import { Invitation, PageKey } from '../model';
import { CoverSlide } from '../view/CoverSlide';
import { FormSlide } from '../view/FormSlide';
import { lookFor, LookProvider } from '../view/look';
import { PageContent } from '../view/PageContent';
import { settledPageIndex } from '../view/storyNav';
import { useMouseSwipe } from '../view/useMouseSwipe';

/** Step5 가운데: 현재 슬라이드 하나를 9:16 으로 크게. 좌우로 밀어도 이동 */
export function SlideStage({
  invitation,
  pages,
  index,
  onIndexChange,
  onEdit,
}: {
  invitation: Invitation;
  pages: PageKey[];
  /** 페이지 인덱스 (정보 칩이 선택됐으면 -1) */
  index: number;
  onIndexChange: (i: number) => void;
  /** 슬라이드를 누르면 입력 시트 열기 */
  onEdit: (page: PageKey) => void;
}) {
  const look = lookFor(invitation.themeId, invitation.templateId);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const scroller = useRef<ScrollView>(null);
  const root = useRef<View>(null);
  // PC 마우스로 끌어 넘기기 — 끈 뒤의 눌림은 입력 시트를 열지 않는다
  const { justDragged, isDragging } = useMouseSwipe({
    root,
    scroller,
    pageWidth: box.width,
    count: pages.length,
    onRelease: (page) => {
      // 같은 장이면 index 가 그대로라 effect 가 안 돈다 — 직접 제자리로
      if (page === index) scroller.current?.scrollTo({ x: page * box.width, animated: true });
      else onIndexChange(page);
    },
  });
  /** 칩·코드로 옮기는 중인 목표 장 — 지나치는 경계에서 번호를 바꾸지 않는다 */
  const target = useRef<number | null>(null);
  // 위아래 여백 16 씩 남기고 맞춘다
  const slide = fitSlide(box.width - 32, box.height - 32);

  useEffect(() => {
    if (index < 0) return;
    target.current = index;
    const done = setTimeout(() => (target.current = null), 800); // 넘김이 끊겨도 막히지 않게
    scroller.current?.scrollTo({ x: index * box.width, animated: true });
    return () => clearTimeout(done);
  }, [index, box.width]);

  return (
    <View
      ref={root}
      style={styles.flex}
      onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
    >
      {box.width > 0 && (
        <LookProvider look={look}>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => onIndexChange(Math.round(e.nativeEvent.contentOffset.x / box.width))}
            // 웹은 onMomentumScrollEnd 가 없다 — 스크롤이 장 경계에 멈추면 번호를 맞춘다
            onScroll={
              Platform.OS === 'web'
                ? (e) => {
                    if (isDragging()) return; // 끄는 중엔 놓을 때 정한다
                    const i = settledPageIndex(e.nativeEvent.contentOffset.x, box.width, pages.length);
                    if (i === null) return;
                    if (target.current !== null) {
                      if (i !== target.current) return;
                      target.current = null;
                    }
                    if (i !== index) onIndexChange(i);
                  }
                : undefined
            }
            scrollEventThrottle={32}
          >
            {pages.map((page) => (
              <View key={page} style={[styles.page, { width: box.width, height: box.height }]}>
                <Pressable onPress={() => !justDragged() && onEdit(page)} style={styles.shadow} accessibilityLabel="이 슬라이드 입력하기">
                  {page === 'cover' ? (
                    <CoverSlide invitation={invitation} width={slide.width} />
                  ) : (
                    <FormSlide width={slide.width} height={slide.height} background={look.bg}>
                      <PageContent page={page} invitation={invitation} />
                    </FormSlide>
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </LookProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  shadow: { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#E8E8E8' },
});
