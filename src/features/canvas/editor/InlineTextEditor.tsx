import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors as ui, radius, spacing } from '../../../theme';
import { CANVAS_FONTS, CANVAS_LIMITS, SLIDE_RATIO } from '../model';
import type { FontKey, TextAlign, TextElement } from '../types';

const ALIGN_ORDER: TextAlign[] = ['center', 'left', 'right'];
const ALIGN_ICON: Record<TextAlign, keyof typeof Ionicons.glyphMap> = {
  center: 'reorder-three-outline',
  left: 'menu-outline',
  right: 'menu-outline',
};
/** 휴대폰은 아래쪽을 키보드가 가리므로 입력하는 동안만 글자를 위쪽으로 올려 보여 준다 (인스타 스토리처럼) */
const NATIVE_MAX_Y = 0.4;

/**
 * 인스타 스토리식 그 자리 글자 입력. 슬라이드 위에 어두운 막을 깔고, 글자 자리에 입력칸을 바로 띄운다.
 * 위쪽 바: 서체·정렬·[완료], 그 아래 색. 어두운 바깥을 누르거나 [완료]면 끝.
 */
export function InlineTextEditor({
  el,
  slide,
  chromeHeight,
  colors,
  onDone,
}: {
  el: TextElement;
  /** 무대 안에서 슬라이드 위치·크기 */
  slide: { left: number; top: number; width: number };
  /** 위쪽 도구 영역 높이 — 서체·색 바가 그만큼 덮어 뒤가 비치지 않게 */
  chromeHeight: number;
  colors: string[];
  /** 끝: 바뀐 모양(서체·색·정렬)과 글자 */
  onDone: (el: TextElement, text: string) => void;
}) {
  const [look, setLook] = useState(el);
  const [text, setText] = useState(el.text);
  const slideH = slide.width * SLIDE_RATIO;
  const width = look.w * slide.width;
  const fontSize = look.size * slide.width;
  const y = Platform.OS === 'web' ? look.y : Math.min(look.y, NATIVE_MAX_Y);

  const finish = () => onDone(look, text);
  const nextAlign = () =>
    setLook((l) => ({ ...l, align: ALIGN_ORDER[(ALIGN_ORDER.indexOf(l.align) + 1) % ALIGN_ORDER.length] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={finish} accessibilityLabel="글자 입력 마치기" />

      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus
        multiline
        maxLength={CANVAS_LIMITS.text}
        placeholder="글자 입력"
        placeholderTextColor="rgba(255,255,255,0.6)"
        style={[
          styles.input,
          {
            left: slide.left + look.x * slide.width - width / 2,
            top: slide.top + y * slideH - fontSize,
            width,
            fontFamily: CANVAS_FONTS[look.font].family,
            fontSize,
            lineHeight: Math.round(fontSize * 1.5),
            color: look.color,
            textAlign: look.align,
          },
        ]}
        accessibilityLabel="글자 입력"
      />

      <View style={[styles.bar, { minHeight: chromeHeight }]}>
        <View style={styles.barRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.grow}
            contentContainerStyle={styles.fonts}
          >
            {(Object.keys(CANVAS_FONTS) as FontKey[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setLook((l) => ({ ...l, font: f }))}
                style={[styles.font, look.font === f && styles.fontOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: look.font === f }}
              >
                <Txt
                  variant="caption"
                  color={look.font === f ? ui.ink : ui.canvas}
                  style={{ fontFamily: CANVAS_FONTS[f].family }}
                >
                  {CANVAS_FONTS[f].label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={nextAlign}
            style={styles.round}
            accessibilityRole="button"
            accessibilityLabel="정렬 바꾸기"
          >
            <Ionicons
              name={ALIGN_ICON[look.align]}
              size={20}
              color={ui.canvas}
              style={look.align === 'right' ? styles.flip : undefined}
            />
          </Pressable>
          <Pressable onPress={finish} style={styles.done} accessibilityRole="button" accessibilityLabel="완료">
            <Txt variant="caption" weight="semibold" color={ui.ink}>
              완료
            </Txt>
          </Pressable>
        </View>
        <View style={styles.colors}>
          {colors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setLook((l) => ({ ...l, color: c }))}
              style={[styles.swatch, { backgroundColor: c }, look.color === c && styles.swatchOn]}
              accessibilityRole="button"
              accessibilityLabel="글자 색"
              accessibilityState={{ selected: look.color === c }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  input: {
    position: 'absolute',
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    // 웹 기본 입력 테두리 없애기
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  // 뒤의 도구 줄이 비치지 않게 어두운 바탕
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    padding: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#1C1C1C',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  fonts: { gap: spacing.xs, paddingRight: spacing.sm },
  font: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  fontOn: { backgroundColor: ui.canvas, borderColor: ui.canvas },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: { transform: [{ scaleX: -1 }] },
  done: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: ui.canvas },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  swatchOn: { borderWidth: 4, borderColor: ui.canvas, transform: [{ scale: 1.15 }] },
});
