import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { ICON_SOURCES, Icon3DName } from '../../../components/brand/Icon3D';
import { Txt } from '../../../components/Txt';
import { colors as ui, radius, spacing } from '../../../theme';
import { bindLabel } from '../model';
import type { BindKey, CanvasBackground } from '../types';

/** 장식 글자 — 텍스트 요소로 들어간다 */
const SYMBOLS = ['♥', '♡', '❀', '✿', '✦', '✧', '☾', '∞'];

export function StickerPicker({
  visible,
  onPick,
  onPickSymbol,
  onClose,
}: {
  visible: boolean;
  onPick: (icon: Icon3DName) => void;
  onPickSymbol: (symbol: string) => void;
  onClose: () => void;
}) {
  return (
    <AppModal visible={visible} title="스티커" onDismiss={onClose} actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}>
      <View style={styles.grid}>
        {(Object.keys(ICON_SOURCES) as Icon3DName[]).map((name) => (
          <Pressable key={name} onPress={() => onPick(name)} style={styles.cell} accessibilityLabel={`스티커 ${name}`}>
            <Image source={ICON_SOURCES[name]} style={styles.icon} contentFit="contain" />
          </Pressable>
        ))}
      </View>
      <Txt variant="caption" weight="semibold" color={ui.label}>
        장식 글자
      </Txt>
      <View style={styles.grid}>
        {SYMBOLS.map((s) => (
          <Pressable key={s} onPress={() => onPickSymbol(s)} style={styles.cell} accessibilityLabel={`장식 ${s}`}>
            <Txt variant="title">{s}</Txt>
          </Pressable>
        ))}
      </View>
    </AppModal>
  );
}

export function BindPicker({
  visible,
  binds,
  themeId,
  onPick,
  onClose,
}: {
  visible: boolean;
  /** 테마별 정보 글자 목록 (bindsFor) */
  binds: BindKey[];
  themeId: string;
  onPick: (b: BindKey) => void;
  onClose: () => void;
}) {
  return (
    <AppModal
      visible={visible}
      title="정보 글자"
      message="기본정보·일시에 쓴 값이 들어가요."
      onDismiss={onClose}
      actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}
    >
      <View style={styles.list}>
        {binds.map((b) => (
          <Pressable key={b} onPress={() => onPick(b)} style={styles.row} accessibilityRole="button">
            <Txt>{bindLabel(b, themeId)}</Txt>
          </Pressable>
        ))}
      </View>
    </AppModal>
  );
}

export function BackgroundPicker({
  visible,
  colors,
  current,
  onTemplate,
  onColor,
  onPhoto,
  onClose,
}: {
  visible: boolean;
  colors: string[];
  current: CanvasBackground;
  onTemplate: () => void;
  onColor: (c: string) => void;
  onPhoto: () => void;
  onClose: () => void;
}) {
  return (
    <AppModal visible={visible} title="배경" onDismiss={onClose} actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}>
      <View style={styles.list}>
        <Pressable onPress={onTemplate} style={[styles.row, current.kind === 'template' && styles.rowOn]} accessibilityRole="button">
          <Txt>템플릿 기본</Txt>
        </Pressable>
        <Pressable onPress={onPhoto} style={[styles.row, current.kind === 'image' && styles.rowOn]} accessibilityRole="button">
          <Txt>사진으로 채우기</Txt>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {colors.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[styles.swatch, { backgroundColor: c }, current.kind === 'color' && current.color === c && styles.swatchOn]}
            accessibilityLabel={`배경색 ${c}`}
          />
        ))}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  cell: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: ui.surface },
  icon: { width: 40, height: 40 },
  list: { gap: spacing.xs, marginVertical: spacing.sm },
  row: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: ui.hairline },
  rowOn: { borderColor: ui.inkSoft },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
