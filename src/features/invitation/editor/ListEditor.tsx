import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  PanResponder,
  PanResponderInstance,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Txt } from '../../../components/Txt';
import { dropIndexByHeights, moveItem } from '../../../lib/sortable';
import { colors, radius, spacing } from '../../../theme';
import { removeItem } from './listOps';

const GAP = spacing.md;

interface Drag {
  id: string;
  from: number;
  dy: number;
}

/**
 * 목록형 입력: 항목 카드 + [+ 추가]. 왼쪽 위 ☰ 를 끌어 순서를 바꾸고, ×로 지운다.
 * 카드 높이가 내용마다 달라 각 카드 높이를 재서 놓일 자리를 계산한다.
 */
export function ListEditor<T extends { id: string }>({
  items,
  max,
  addLabel,
  onAdd,
  onChange,
  onDragChange,
  renderItem,
}: {
  items: T[];
  max: number;
  addLabel: string;
  onAdd: () => void;
  onChange: (items: T[]) => void;
  /** 끄는 동안 바깥 스크롤을 막을 수 있게 알려준다 */
  onDragChange?: (dragging: boolean) => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const full = items.length >= max;
  const [drag, setDrag] = useState<Drag | null>(null);
  const heights = useRef(new Map<string, number>());

  // 제스처 도중 리렌더돼도 같은 응답자를 쓰도록 id 별로 보관하고, 최신 값은 ref 로 읽는다
  const latest = useRef({ items, onChange, onDragChange });
  latest.current = { items, onChange, onDragChange };
  const responders = useRef(new Map<string, PanResponderInstance>());

  const target = (from: number, dy: number) =>
    dropIndexByHeights({
      heights: latest.current.items.map((i) => heights.current.get(i.id) ?? 0),
      gap: GAP,
      from,
      dy,
    });

  const responderFor = (id: string) => {
    let r = responders.current.get(id);
    if (!r) {
      const fromIndex = () => latest.current.items.findIndex((i) => i.id === id);
      const end = () => {
        setDrag(null);
        latest.current.onDragChange?.(false);
      };
      r = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          latest.current.onDragChange?.(true);
          setDrag({ id, from: fromIndex(), dy: 0 });
        },
        onPanResponderMove: (_, g) => setDrag((d) => (d ? { ...d, dy: g.dy } : d)),
        onPanResponderRelease: (_, g) => {
          const from = fromIndex();
          const to = target(from, g.dy);
          if (to !== from) latest.current.onChange(moveItem(latest.current.items, from, to));
          end();
        },
        onPanResponderTerminate: end,
      });
      responders.current.set(id, r);
    }
    return r;
  };

  // 끄는 동안: 끄는 카드는 손가락을 따라가고, 그 사이 카드들은 끄는 카드 높이만큼 비켜 준다
  const to = drag ? target(drag.from, drag.dy) : -1;
  const shift = drag ? (heights.current.get(drag.id) ?? 0) + GAP : 0;
  const offsetOf = (i: number, id: string) => {
    if (!drag) return 0;
    if (id === drag.id) return drag.dy;
    if (drag.from < to && i > drag.from && i <= to) return -shift;
    if (drag.from > to && i >= to && i < drag.from) return shift;
    return 0;
  };

  // 화면 낭독기: ☰ 에서 위로·아래로 동작
  const onA11y = (i: number) => (e: AccessibilityActionEvent) => {
    const j = e.nativeEvent.actionName === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < items.length) onChange(moveItem(items, i, j));
  };

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => {
        const dragging = drag?.id === item.id;
        return (
          <View
            key={item.id}
            onLayout={(e) => heights.current.set(item.id, e.nativeEvent.layout.height)}
            style={[styles.card, { transform: [{ translateY: offsetOf(i, item.id) }] }, dragging && styles.dragging]}
          >
            <View style={styles.head}>
              <View
                {...responderFor(item.id).panHandlers}
                style={styles.handle}
                accessible
                accessibilityLabel="순서 바꾸기"
                accessibilityActions={[
                  { name: 'up', label: '위로' },
                  { name: 'down', label: '아래로' },
                ]}
                onAccessibilityAction={onA11y(i)}
              >
                <Ionicons name="reorder-three" size={20} color={colors.inkSoft} />
                <Txt variant="caption" weight="semibold" color={colors.muted}>
                  {String(i + 1)}
                </Txt>
              </View>
              <Pressable
                onPress={() => onChange(removeItem(items, item.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="삭제"
              >
                <Ionicons name="close" size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
            {renderItem(item, i)}
          </View>
        );
      })}
      <Pressable
        onPress={onAdd}
        disabled={full}
        style={[styles.add, full && styles.addOff]}
        accessibilityRole="button"
        accessibilityState={{ disabled: full }}
      >
        <Ionicons name="add" size={16} color={full ? colors.placeholder : colors.brand} />
        <Txt variant="caption" weight="semibold" color={full ? colors.placeholder : colors.brand}>
          {addLabel}
        </Txt>
      </Pressable>
      <Txt variant="tiny" color={colors.faint}>
        {`최대 ${max}개까지 넣을 수 있어요.`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: GAP },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  dragging: {
    zIndex: 10,
    borderColor: colors.brand,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: spacing.md,
  },
  add: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: 'dashed',
  },
  addOff: { borderColor: colors.hairline },
});
