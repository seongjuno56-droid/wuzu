import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, spacing } from '../../../theme';

export type ToolKey = 'text' | 'bind' | 'photo' | 'sticker' | 'gif' | 'video' | 'pen' | 'paste' | 'background';

const TOOLS: { key: ToolKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'text', label: '텍스트', icon: 'text-outline' },
  { key: 'bind', label: '정보 글자', icon: 'link-outline' },
  { key: 'photo', label: '사진', icon: 'image-outline' },
  { key: 'sticker', label: '스티커', icon: 'happy-outline' },
  { key: 'gif', label: 'GIF', icon: 'film-outline' },
  { key: 'video', label: '동영상', icon: 'videocam-outline' },
  { key: 'pen', label: '펜', icon: 'brush-outline' },
  { key: 'paste', label: '붙여넣기', icon: 'clipboard-outline' },
  { key: 'background', label: '배경', icon: 'color-fill-outline' },
];

/** 캔버스 상단 도구 줄 */
export function CanvasToolbar({ onTool, active }: { onTool: (t: ToolKey) => void; active?: ToolKey | null }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bar}>
      {TOOLS.map((t) => (
        <Pressable key={t.key} onPress={() => onTool(t.key)} style={styles.tool} accessibilityRole="button" accessibilityLabel={t.label}>
          <Ionicons name={t.icon} size={22} color={active === t.key ? colors.infoInk : colors.inkSoft} />
          <Txt variant="tiny" color={active === t.key ? colors.infoInk : colors.label}>
            {t.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: colors.canvas },
  row: { paddingHorizontal: spacing.sm },
  tool: { width: 60, paddingVertical: spacing.sm, alignItems: 'center', gap: 2 },
});
