import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '../../theme';

interface Props {
  width?: number;
  height?: number;
  color?: string;
  /** 우표 뒤 바탕색 — 톱니 구멍을 이 색으로 뚫는다 */
  backdrop?: string;
  rotate?: number;
  children?: ReactNode;
  style?: ViewStyle;
}

const HOLE_R = 3;
const HOLE_GAP = 9;

/** 톱니(퍼포레이션) 가장자리가 있는 우표 */
export function Stamp({
  width = 56,
  height = 68,
  color = colors.accent,
  backdrop = colors.bg,
  rotate = 0,
  children,
  style,
}: Props) {
  const holes: { x: number; y: number }[] = [];
  for (let x = HOLE_GAP / 2; x < width; x += HOLE_GAP) holes.push({ x, y: 0 }, { x, y: height });
  for (let y = HOLE_GAP / 2; y < height; y += HOLE_GAP) holes.push({ x: 0, y }, { x: width, y });

  return (
    <View style={[{ width, height, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} fill={color} />
        <Rect
          x={6}
          y={6}
          width={width - 12}
          height={height - 12}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth={1}
        />
        {holes.map((h, i) => (
          <Circle key={i} cx={h.x} cy={h.y} r={HOLE_R} fill={backdrop} />
        ))}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
