import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useWallet } from '../features/wallet/useWallet';
import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

/** 헤더 오른쪽 보유 레터 — 누르면 레터 지갑 */
export function LetterBadge() {
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return (
    <Pressable
      onPress={() => router.push('/wallet')}
      style={styles.badge}
      accessibilityRole="button"
      accessibilityLabel={`보유 레터 ${balance ?? ''}, 레터 지갑으로 이동`}
    >
      <Txt variant="tiny" weight="semibold" color={colors.infoInk}>
        레터 {balance ?? '–'}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.infoTint,
  },
});
