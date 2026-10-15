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
}

export function Header({ title, onBack, hideBack, right }: Props) {
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));
  return (
    <View style={styles.bar}>
      {!hideBack && (
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      )}
      <Txt variant="subtitle" weight="bold" style={styles.title} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: { flex: 1 },
});
