/* eslint-disable react-hooks/refs -- gesture-handler 빌더에 넘기는 콜백은 터치 이벤트 때만 실행된다(렌더 중 실행 아님). 그리는 중 점 목록은 ref 로 쌓는다 */
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '../../../components/Txt';
import { colors as ui, spacing } from '../../../theme';
import type { CanvasTool } from '../canvasStore';

/** 360px 폭 기준 굵기 3단계 */
export const PEN_WIDTHS = [2, 4, 8];

type Pt = { x: number; y: number };
const toPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

/** 펜 모드일 때 슬라이드를 덮는 층. 한 번 그은 선 = 요소 하나 */
export function PenLayer({
  slideW,
  slideH,
  color,
  widthPx,
  onStroke,
}: {
  slideW: number;
  slideH: number;
  color: string;
  widthPx: number;
  onStroke: (points: Pt[]) => void;
}) {
  const [points, setPoints] = useState<Pt[]>([]);
  const ref = useRef<Pt[]>([]);
  const draw = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      ref.current = [{ x: e.x, y: e.y }];
      setPoints(ref.current);
    })
    .onUpdate((e) => {
      ref.current = [...ref.current, { x: e.x, y: e.y }];
      setPoints(ref.current);
    })
    .onFinalize(() => {
      onStroke(ref.current);
      ref.current = [];
      setPoints([]);
    });

  return (
    <GestureDetector gesture={draw}>
      <View style={StyleSheet.absoluteFill} accessibilityLabel="그리기 영역">
        <Svg width={slideW} height={slideH}>
          {points.length > 1 && (
            <Path d={toPath(points)} stroke={color} strokeWidth={widthPx} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}

/** 펜 옵션 바: 펜/지우개, 굵기, 색, 끝내기 */
export function PenOptions({
  colors,
  color,
  width,
  tool,
  onColor,
  onWidth,
  onTool,
  onClose,
}: {
  colors: string[];
  color: string;
  width: number;
  tool: CanvasTool;
  onColor: (c: string) => void;
  onWidth: (w: number) => void;
  onTool: (t: CanvasTool) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={() => onTool('pen')} style={[styles.mode, tool === 'pen' && styles.on]} accessibilityLabel="펜">
          <Ionicons name="brush-outline" size={20} color={ui.inkSoft} />
        </Pressable>
        <Pressable onPress={() => onTool('eraser')} style={[styles.mode, tool === 'eraser' && styles.on]} accessibilityLabel="지우개">
          <Ionicons name="backspace-outline" size={20} color={ui.inkSoft} />
        </Pressable>
        {PEN_WIDTHS.map((w) => (
          <Pressable key={w} onPress={() => onWidth(w)} style={[styles.mode, width === w && styles.on]} accessibilityLabel={`굵기 ${w}`}>
            <View style={{ width: 18, height: w, borderRadius: w, backgroundColor: ui.inkSoft }} />
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
          <Txt variant="caption" weight="semibold">
            그리기 끝
          </Txt>
        </Pressable>
      </View>
      <View style={styles.row}>
        {colors.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
            accessibilityLabel={`펜 색 ${c}`}
          />
        ))}
      </View>
      {tool === 'eraser' && (
        <Txt variant="tiny" color={ui.muted} align="center">
          지울 선을 눌러 주세요.
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: ui.hairline, backgroundColor: ui.canvas, paddingVertical: spacing.xs, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  mode: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: ui.brandTint, borderWidth: 1, borderColor: ui.brand },
  close: { marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
