import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors as ui, radius, spacing } from '../../../theme';
import { CANVAS_FONTS } from '../model';
import type { CanvasElement, FontKey, PhotoFrame, TextAlign } from '../types';

export type PropertyCommand = 'edit' | 'replace' | 'front' | 'back' | 'duplicate' | 'delete';

const ALIGNS: { value: TextAlign; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'left', label: '왼쪽', icon: 'chevron-back-outline' },
  { value: 'center', label: '가운데', icon: 'remove-outline' },
  { value: 'right', label: '오른쪽', icon: 'chevron-forward-outline' },
];

/** 돌잔치 표지 사진 틀 */
const FRAMES: { value: PhotoFrame; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'arch', label: '아치', icon: 'tablet-portrait-outline' },
  { value: 'circle', label: '원형', icon: 'ellipse-outline' },
  { value: 'oval', label: '타원', icon: 'egg-outline' },
  { value: 'rounded', label: '둥근 사각', icon: 'square-outline' },
  { value: 'cloud', label: '구름', icon: 'cloud-outline' },
];

/** 선택한 요소의 속성 바 — 글자: 서체·색·크기·정렬, 사진: 모양·교체, 공통: 순서·복제·삭제 */
export function PropertyBar({
  el,
  colors,
  onChange,
  onCommand,
}: {
  el: CanvasElement;
  colors: string[];
  onChange: (patch: Partial<CanvasElement>) => void;
  onCommand: (c: PropertyCommand) => void;
}) {
  const isText = el.kind === 'text' || el.kind === 'bound';
  const icon = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={styles.btn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={name} size={20} color={ui.inkSoft} />
      <Txt variant="tiny" color={ui.label}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {isText && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {(Object.keys(CANVAS_FONTS) as FontKey[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => onChange({ font: f })}
                style={[styles.font, el.font === f && styles.fontOn]}
                accessibilityRole="button"
              >
                <Txt variant="caption" style={{ fontFamily: CANVAS_FONTS[f].family }}>
                  {CANVAS_FONTS[f].label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.row}>
            {colors.map((c) => (
              <Pressable
                key={c}
                onPress={() => onChange({ color: c })}
                style={[styles.swatch, { backgroundColor: c }, el.color === c && styles.swatchOn]}
                accessibilityLabel={`색 ${c}`}
              />
            ))}
          </View>
        </>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {el.kind === 'text' && icon('create-outline', '수정', () => onCommand('edit'))}
        {el.kind === 'bound' && icon('create-outline', '수정', () => onCommand('edit'))}
        {isText && icon('remove-outline', '작게', () => onChange({ size: el.size * 0.9 }))}
        {isText && icon('add-outline', '크게', () => onChange({ size: el.size * 1.1 }))}
        {isText && ALIGNS.map((a) => icon(a.icon, a.label, () => onChange({ align: a.value })))}
        {el.kind === 'image' && icon('square-outline', '사각', () => onChange({ shape: 'rect' }))}
        {el.kind === 'image' && icon('tablet-portrait-outline', '둥근', () => onChange({ shape: 'rounded' }))}
        {el.kind === 'image' && icon('ellipse-outline', '원', () => onChange({ shape: 'circle' }))}
        {el.kind === 'image' && icon('swap-horizontal-outline', '교체', () => onCommand('replace'))}
        {el.kind === 'photo' &&
          FRAMES.map((f) =>
            icon(f.icon, f.label, () => onChange({ frame: f.value, aspect: f.value === 'circle' ? 1 : 1.25 } as Partial<CanvasElement>)),
          )}
        {icon('arrow-up-outline', '앞으로', () => onCommand('front'))}
        {icon('arrow-down-outline', '뒤로', () => onCommand('back'))}
        {icon('copy-outline', '복제', () => onCommand('duplicate'))}
        {icon('trash-outline', '삭제', () => onCommand('delete'))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: ui.hairline, backgroundColor: ui.canvas, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  btn: { width: 52, alignItems: 'center', gap: 2 },
  font: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.xs, borderWidth: 1, borderColor: ui.hairline },
  fontOn: { borderColor: ui.brand, backgroundColor: ui.brandTint },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
