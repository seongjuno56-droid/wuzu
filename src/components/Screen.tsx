import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, MAX_APP_WIDTH } from '../theme';

interface Props {
  children: ReactNode;
  /** 스크롤 영역 아래에 고정되는 영역 (하단 CTA 등) */
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  background?: string;
  contentStyle?: ViewStyle;
  edges?: Edge[];
}

export function Screen({
  children,
  footer,
  header,
  scroll = true,
  background = colors.bg,
  contentStyle,
  edges = ['top', 'bottom'],
}: Props) {
  return (
    <View style={styles.outer}>
      <SafeAreaView edges={edges} style={[styles.frame, { backgroundColor: background }]}>
        {header}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.surfaceStrong, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
