import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** 형식 페이지를 9:16 칸에 담는다. 내용이 넘치면(방명록·계좌·그리드 갤러리) 칸 안에서 세로 스크롤 */
export function FormSlide({
  width,
  height,
  background,
  children,
}: {
  width: number;
  height: number;
  background: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.slide, { width, height, backgroundColor: background }]}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { overflow: 'hidden' },
  content: { flexGrow: 1, justifyContent: 'center' },
});
