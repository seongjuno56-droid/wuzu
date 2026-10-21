import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';

import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { Invitation, PAGE_LABEL, ReorderablePage, SECTION_LABEL } from '../model';
import { DockItem, itemDone, movablePages, moveInDock, slotsMoved } from './pages';

const THUMB_W = 44;
const ITEM_W = 56;
/** 한 칸 간격 = 항목 폭 + 사이 간격 */
const PITCH = ITEM_W + spacing.sm;
/** 이만큼 꾹 누르면 끌기 시작 — 짧게 누르면 그 장으로 이동 */
const LONG_PRESS_MS = 300;

interface Drag {
  page: ReorderablePage;
  dx: number;
}

/** 옮길 수 있는 장 하나: 꾹 눌러 좌우로 끌면 순서를 바꾼다 */
function Movable({
  page,
  onStart,
  onMove,
  onDrop,
  children,
}: {
  page: ReorderablePage;
  onStart: (page: ReorderablePage) => void;
  onMove: (dx: number) => void;
  onDrop: (dx: number) => void;
  children: ReactNode;
}) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => onStart(page))
    .onUpdate((e) => onMove(e.translationX))
    .onEnd((e) => onDrop(e.translationX))
    .onFinalize((_, success) => {
      if (!success) onDrop(0);
    });
  return <GestureDetector gesture={pan}>{children}</GestureDetector>;
}

/**
 * 하단 독바: 슬라이드 썸네일 + 정보 칩. 미완료는 빨간 점.
 * 갤러리·예식 정보·방명록·계좌 썸네일은 꾹 눌러 끌어 순서를 바꾼다 (표지·인사말·엔딩은 고정).
 */
export function DockBar({
  items,
  active,
  invitation,
  onSelect,
  onReorder,
}: {
  items: DockItem[];
  /** 선택된 항목 인덱스 */
  active: number;
  invitation: Invitation;
  onSelect: (index: number) => void;
  onReorder: (order: ReorderablePage[]) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const movable = movablePages(invitation);

  // 끄는 장은 범위 안에서 손을 따라가고, 지나친 칸의 장들은 한 칸씩 비켜 준다
  const from = drag ? movable.indexOf(drag.page) : -1;
  const dx = drag ? Math.max(-from * PITCH, Math.min((movable.length - 1 - from) * PITCH, drag.dx)) : 0;
  const target = drag ? Math.max(0, Math.min(movable.length - 1, from + slotsMoved(dx, PITCH))) : -1;
  const shiftOf = (page: ReorderablePage) => {
    if (!drag) return 0;
    if (page === drag.page) return dx;
    const j = movable.indexOf(page);
    if (from < target && j > from && j <= target) return -PITCH;
    if (from > target && j >= target && j < from) return PITCH;
    return 0;
  };

  const drop = (finalDx: number) => {
    if (!drag) return;
    const slots = slotsMoved(finalDx, PITCH);
    if (slots) onReorder(moveInDock(invitation, drag.page, slots));
    setDrag(null);
  };

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        scrollEnabled={!drag}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item, i) => {
          const on = i === active;
          const done = itemDone(invitation, item);
          const label = item.kind === 'page' ? PAGE_LABEL[item.page] : SECTION_LABEL[item.section];
          const page = item.kind === 'page' && (movable as string[]).includes(item.page) ? (item.page as ReorderablePage) : null;
          const lifted = !!page && drag?.page === page;
          const cell = (
            <Pressable
              key={item.kind === 'page' ? item.page : `info-${item.section}`}
              onPress={() => onSelect(i)}
              style={[
                styles.item,
                page && { transform: [{ translateX: shiftOf(page) }, { scale: lifted ? 1.08 : 1 }] },
                lifted && styles.lifted,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${done ? '작성 완료' : '작성 필요'}`}
              accessibilityHint={page ? '꾹 눌러 끌면 순서를 바꿀 수 있어요' : undefined}
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
          return page ? (
            <Movable
              key={page}
              page={page}
              onStart={(p) => setDrag({ page: p, dx: 0 })}
              onMove={(x) => setDrag((d) => (d ? { ...d, dx: x } : d))}
              onDrop={drop}
            >
              {cell}
            </Movable>
          ) : (
            cell
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.canvas },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  item: { alignItems: 'center', gap: 4, width: ITEM_W },
  lifted: { zIndex: 1, opacity: 0.92 },
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
