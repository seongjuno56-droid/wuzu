import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BANNERS } from '../../data/home';
import { radius, spacing } from '../../theme';
import { Txt } from '../Txt';

const AUTO_MS = 4000;

export function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const total = BANNERS.length;
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % total), AUTO_MS);
    return () => clearInterval(t);
  }, [total, index]);

  const b = BANNERS[index];
  return (
    <View style={[styles.banner, { backgroundColor: b.bg }]}>
      <Pressable onPress={() => go(-1)} hitSlop={8} accessibilityLabel="이전 배너">
        <Ionicons name="chevron-back-circle-outline" size={28} color={b.fg} />
      </Pressable>
      <View style={styles.text}>
        <Txt variant="tiny" weight="bold" color={b.fg} style={styles.eyebrow}>
          {b.eyebrow}
        </Txt>
        <Txt variant="subtitle" weight="bold" color={b.fg}>
          {b.title}
        </Txt>
      </View>
      <Pressable onPress={() => go(1)} hitSlop={8} accessibilityLabel="다음 배너">
        <Ionicons name="chevron-forward-circle-outline" size={28} color={b.fg} />
      </Pressable>
      <View style={[styles.counter, { borderColor: b.fg }]}>
        <Txt variant="tiny" color={b.fg}>
          {index + 1}/{total}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 128,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  text: { flex: 1, gap: spacing.xs },
  eyebrow: { letterSpacing: 1.2, opacity: 0.8 },
  counter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    opacity: 0.8,
  },
});
