import { StyleSheet, View } from 'react-native';

const GUIDE = '#3750BE';

/** 가운데 가이드선 — 요소가 가운데에 붙었을 때만 */
export function Guides({ x, y, slideW, slideH }: { x: boolean; y: boolean; slideW: number; slideH: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {x && <View style={{ position: 'absolute', left: slideW / 2, top: 0, width: 1, height: slideH, backgroundColor: GUIDE }} />}
      {y && <View style={{ position: 'absolute', top: slideH / 2, left: 0, height: 1, width: slideW, backgroundColor: GUIDE }} />}
    </View>
  );
}
