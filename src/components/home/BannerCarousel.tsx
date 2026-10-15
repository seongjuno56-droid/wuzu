import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BANNERS } from '../../data/home';
import { radius, spacing } from '../../theme';
import { Icon3D } from '../brand/Icon3D';
import { Txt } from '../Txt';

const AUTO_MS = 4500;

/** 배너 카드 (16px 반경) — 색과 3D 일러스트가 '이미지' 역할 */
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
      <Icon3D name={b.art} size={112} style={styles.art} />
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
  art: { position: 'absolute', right: 20, bottom: 18 },
  counter: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
