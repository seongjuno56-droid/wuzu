import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

interface Props {
  children: ReactNode;
  /** 스크롤 영역 아래에 고정되는 영역 (하단 CTA 등) */
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  /** 스크롤 영역은 유지한 채 스크롤만 잠근다 (드래그 중 등). scroll 을 바꾸면 내용이 다시 만들어지므로 이것을 쓴다 */
  scrollEnabled?: boolean;
  background?: string;
  contentStyle?: ViewStyle;
  edges?: Edge[];
}

export function Screen({
  children,
  footer,
  header,
  scroll = true,
  scrollEnabled = true,
  background = colors.canvas,
  contentStyle,
  edges = ['top', 'bottom'],
}: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: background }]}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
