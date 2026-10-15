import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BANNERS } from '../../data/home';
import { radius, spacing } from '../../theme';
import { Stamp } from '../brand/Stamp';
import { Txt } from '../Txt';

const AUTO_MS = 4500;

/** 배너 카드 (16px 반경) — 색은 배너 이미지가 담당 */
export function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const total = BANNERS.length;

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % total), AUTO_MS);
    return () => clearInterval(t);
  }, [total, index]);

  const b = BANNERS[index];
  return (
    <Pressable
      onPress={() => setIndex((i) => (i + 1) % total)}
      accessibilityRole="button"
      accessibilityLabel={`${b.title.replace('\n', ' ')}, ${index + 1}/${total}`}
      style={[styles.banner, { backgroundColor: b.bg }]}
    >
      <View style={styles.text}>
        <Txt variant="headline" color={b.fg}>
          {b.title}
        </Txt>
        <Txt variant="caption" color={b.fg} style={styles.body}>
          {b.body}
        </Txt>
      </View>
      <Stamp width={84} height={102} color={b.stamp} backdrop={b.bg} rotate={-8} style={styles.stamp}>
        <Ionicons name={b.icon} size={36} color="#fff" />
      </Stamp>
      <View style={styles.counter}>
        <Txt variant="tiny" color="#fff">
          {index + 1} / {total}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { height: 180, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' },
  text: { gap: spacing.xs },
  body: { opacity: 0.7 },
  stamp: { position: 'absolute', right: 28, bottom: 26 },
  counter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
