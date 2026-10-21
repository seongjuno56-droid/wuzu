import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fitSlide } from '../../canvas/model';
import { Invitation, PageKey } from '../model';
import { CoverSlide } from '../view/CoverSlide';
import { FormSlide } from '../view/FormSlide';
import { lookFor, LookProvider } from '../view/look';
import { PageContent } from '../view/PageContent';
import { settledPageIndex } from '../view/storyNav';

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
                <Pressable onPress={() => onEdit(page)} style={styles.shadow} accessibilityLabel="이 슬라이드 입력하기">
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
