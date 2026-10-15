import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../../theme';
import { Wordmark } from './Wordmark';

const W = 200;
const H = Math.round(W * 0.64);
const BODY = '#EDEDED';
const POCKET = '#E2E2E2';
const FLAP = '#D6D6D6';
const useNative = Platform.OS !== 'web';

/** 스플래시 단 한 번의 연출: 봉투 뚜껑이 열리고 로고 카드가 올라온다 */
export function OpeningEnvelope({ onDone }: { onDone?: () => void }) {
  const flap = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        flap.setValue(1);
        card.setValue(1);
        onDone?.();
        return;
      }
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(flap, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.cubic), useNativeDriver: useNative }),
        Animated.timing(card, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }),
      ]).start(() => !cancelled && onDone?.());
    });
    return () => {
      cancelled = true;
    };
  }, [flap, card, onDone]);

  const flapScale = flap.interpolate({ inputRange: [0, 1], outputRange: [1, -1] });
  const cardY = card.interpolate({ inputRange: [0, 1], outputRange: [24, -64] });
  const cardOpacity = card.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });

  return (
    <View style={styles.envelope}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H} rx={8} fill={BODY} />
      </Svg>
      <Animated.View style={[styles.flap, { transform: [{ scaleY: flapScale }] }]}>
        <Svg width={W} height={H * 0.58}>
          <Path d={`M0 0 L${W / 2} ${H * 0.58} L${W} 0 Z`} fill={FLAP} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
        <Wordmark size={34} />
      </Animated.View>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={`M0 ${H} L0 ${H * 0.34} L${W / 2} ${H * 0.66} L${W} ${H * 0.34} L${W} ${H} Z`} fill={POCKET} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  envelope: { width: W, height: H, alignSelf: 'center' },
  flap: { position: 'absolute', top: 0, left: 0, transformOrigin: 'top' },
  card: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 12,
    height: H - 24,
    borderRadius: 4,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
