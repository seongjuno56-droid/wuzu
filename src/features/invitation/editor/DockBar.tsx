import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { Invitation, PAGE_LABEL, SECTION_LABEL } from '../model';
import { DockItem, itemDone } from './pages';

const THUMB_W = 44;

/** 하단 독바: 슬라이드 썸네일 + 정보 칩. 미완료는 빨간 점 */
export function DockBar({
  items,
  active,
  invitation,
  onSelect,
}: {
  items: DockItem[];
  /** 선택된 항목 인덱스 */
  active: number;
  invitation: Invitation;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item, i) => {
          const on = i === active;
          const done = itemDone(invitation, item);
          const label = item.kind === 'page' ? PAGE_LABEL[item.page] : SECTION_LABEL[item.section];
          return (
            <Pressable
              key={item.kind === 'page' ? item.page : `info-${item.section}`}
              onPress={() => onSelect(i)}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${done ? '작성 완료' : '작성 필요'}`}
            >
              <View style={[item.kind === 'page' ? styles.thumb : styles.chip, on && styles.on]}>
                {item.kind === 'info' && (
                  <Ionicons name={item.section === 'bgm' ? 'musical-notes-outline' : 'person-outline'} size={18} color={colors.label} />
                )}
                {!done && <View style={styles.dot} />}
              </View>
              <Txt variant="tiny" color={on ? colors.brand : colors.muted} weight={on ? 'semibold' : 'regular'}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.canvas },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  item: { alignItems: 'center', gap: 4, width: 56 },
  thumb: {
    width: THUMB_W,
    height: Math.round((THUMB_W * 16) / 9),
    borderRadius: radius.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chip: {
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { borderColor: colors.brand, borderWidth: 2 },
  dot: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
});
