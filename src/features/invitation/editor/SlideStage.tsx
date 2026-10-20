import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fitSlide } from '../../canvas/model';
import { Invitation, PageKey } from '../model';
import { CoverSlide } from '../view/CoverSlide';
import { FormSlide } from '../view/FormSlide';
import { lookFor, LookProvider } from '../view/look';
import { PageContent } from '../view/PageContent';

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
  // 위아래 여백 16 씩 남기고 맞춘다
  const slide = fitSlide(box.width - 32, box.height - 32);

  useEffect(() => {
    if (index >= 0) scroller.current?.scrollTo({ x: index * box.width, animated: true });
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
