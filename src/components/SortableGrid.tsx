import { ReactNode, useRef, useState } from 'react';
import { GestureResponderHandlers, LayoutChangeEvent, PanResponder, PanResponderInstance, View } from 'react-native';

import { dropIndex, moveItem } from '../lib/sortable';

interface Props<T> {
  items: T[];
  keyOf: (item: T) => string;
  columns: number;
  /** 칸 높이. 생략하면 정사각형(칸 너비와 같음) */
  itemHeight?: number;
  gap: number;
  onChange: (items: T[]) => void;
  /** 드래그 중에는 바깥 스크롤을 막을 수 있게 알려준다 */
  onDragChange?: (dragging: boolean) => void;
  /** handle 을 원하는 뷰(☰ 아이콘 등)에 펼쳐 붙이면 그 부분을 잡고 끌 수 있다 */
  renderItem: (item: T, ctx: { handle: GestureResponderHandlers; dragging: boolean }) => ReactNode;
}

interface Drag {
  key: string;
  from: number;
  dx: number;
  dy: number;
}

/** 손잡이를 끌어 순서를 바꾸는 목록/격자 (columns=1 이면 세로 목록) */
export function SortableGrid<T>({ items, keyOf, columns, itemHeight, gap, onChange, onDragChange, renderItem }: Props<T>) {
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);

  const cellWidth = width ? (width - gap * (columns - 1)) / columns : 0;
  const cellHeight = itemHeight ?? cellWidth;

  // 제스처 도중 리렌더돼도 같은 응답자를 쓰도록 key 별로 보관하고, 최신 값은 ref 로 읽는다
  const latest = useRef({ items, cellWidth, cellHeight, onChange, onDragChange });
  latest.current = { items, cellWidth, cellHeight, onChange, onDragChange };
  const responders = useRef(new Map<string, PanResponderInstance>());

  const responderFor = (key: string) => {
    let r = responders.current.get(key);
    if (!r) {
      const target = (dx: number, dy: number, from: number) =>
        dropIndex({
          from,
          dx,
          dy,
          columns,
          cellWidth: latest.current.cellWidth,
          cellHeight: latest.current.cellHeight,
          gap,
          count: latest.current.items.length,
        });
      const fromIndex = () => latest.current.items.findIndex((i) => keyOf(i) === key);
      r = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          latest.current.onDragChange?.(true);
          setDrag({ key, from: fromIndex(), dx: 0, dy: 0 });
        },
        onPanResponderMove: (_, g) => setDrag((d) => (d ? { ...d, dx: g.dx, dy: g.dy } : d)),
        onPanResponderRelease: (_, g) => {
          const from = fromIndex();
          const to = target(g.dx, g.dy, from);
          if (to !== from) latest.current.onChange(moveItem(latest.current.items, from, to));
          setDrag(null);
          latest.current.onDragChange?.(false);
        },
        onPanResponderTerminate: () => {
          setDrag(null);
          latest.current.onDragChange?.(false);
        },
      });
      responders.current.set(key, r);
    }
    return r;
  };

  // 드래그 중이면 놓일 자리를 미리 비워 둔 순서로 배치한다
  const preview =
    drag && cellWidth
      ? moveItem(
          items,
          drag.from,
          dropIndex({ from: drag.from, dx: drag.dx, dy: drag.dy, columns, cellWidth, cellHeight, gap, count: items.length }),
        )
      : items;
  const rows = Math.ceil(items.length / columns);
  const slot = (i: number) => ({
    left: (i % columns) * (cellWidth + gap),
    top: Math.floor(i / columns) * (cellHeight + gap),
  });

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: rows ? rows * cellHeight + (rows - 1) * gap : 0 }}
    >
      {cellWidth > 0 &&
        items.map((item) => {
          const key = keyOf(item);
          const dragging = drag?.key === key;
          const pos = dragging ? slot(drag.from) : slot(preview.findIndex((i) => keyOf(i) === key));
          return (
            <View
              key={key}
              style={{
                position: 'absolute',
                width: cellWidth,
                height: cellHeight,
                left: pos.left + (dragging ? drag.dx : 0),
                top: pos.top + (dragging ? drag.dy : 0),
                zIndex: dragging ? 10 : 1,
                opacity: dragging ? 0.9 : 1,
              }}
            >
              {renderItem(item, { handle: responderFor(key).panHandlers, dragging })}
            </View>
          );
        })}
    </View>
  );
}
