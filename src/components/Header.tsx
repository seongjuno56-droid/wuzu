import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Txt } from './Txt';

interface Props {
  title?: string;
  onBack?: () => void;
  hideBack?: boolean;
  right?: ReactNode;
  background?: string;
  tint?: string;
  /** 아래 헤어라인 표시 (기본 true) */
  divider?: boolean;
}

/** 흰 바탕 헤더: 왼쪽 뒤로가기, 가운데 제목(18/600), 오른쪽 액션 */
export function Header({
  title,
  onBack,
  hideBack,
  right,
  background = colors.canvas,
  tint = colors.inkSoft,
  divider = true,
}: Props) {
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));
  return (
    <View style={[styles.bar, { backgroundColor: background }, divider && styles.divider]}>
      <View style={styles.side}>
        {!hideBack && (
          <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="뒤로 가기">
            <Ionicons name="chevron-back" size={24} color={tint} />
          </Pressable>
        )}
      </View>
      <Txt variant="title" color={tint} style={styles.title} numberOfLines={1} align="center">
        {title}
      </Txt>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  side: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1 },
});
