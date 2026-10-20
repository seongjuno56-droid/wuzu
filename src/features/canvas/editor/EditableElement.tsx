/* eslint-disable react-hooks/refs -- gesture-handler 빌더에 넘기는 콜백은 터치 이벤트 때만 실행된다(렌더 중 실행 아님). 진행 중 값은 ref 로 들고 있어야 한 번의 조작을 한 번에 커밋할 수 있다 */
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { InvitationContent } from '../../invitation/model';
import { clampWidth, SLIDE_RATIO, snapCenter, snapRotation } from '../model';
import { ElementContent, ElementView } from '../render/ElementView';
import type { CanvasElement } from '../types';

const HANDLE = 22;
const rad = (deg: number) => (deg * Math.PI) / 180;

interface Props {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  selected: boolean;
  /** 펜 모드 등에서는 끈다 */
  interactive: boolean;
  onSelect: () => void;
  /** 조작 하나가 끝나면 한 번 (되돌리기 1단계) */
  onCommit: (next: CanvasElement) => void;
  onGuides: (g: { x: boolean; y: boolean }) => void;
  onDoubleTap: () => void;
}

/**
 * 요소 제스처: 한 손가락 끌기 = 이동, 두 손가락 = 크기·회전, 더블탭 = 텍스트 수정.
 * 마우스(웹)·한 손 조작을 위해 선택 시 오른쪽 아래 손잡이로도 크기·회전을 바꾼다.
 * 진행 중 값은 이 컴포넌트 상태에만 두고, 손을 떼면 onCommit 한 번.
 */
export function EditableElement({ el, content, slideW, selected, interactive, onSelect, onCommit, onGuides, onDoubleTap }: Props) {
  const slideH = slideW * SLIDE_RATIO;
  const [live, setLive] = useState<CanvasElement | null>(null);
  const [boxH, setBoxH] = useState(0);
  const start = useRef(el);
  const current = useRef(el);
  const active = useRef(0);

  const update = (patch: Partial<CanvasElement>) => {
    current.current = { ...current.current, ...patch } as CanvasElement;
    setLive(current.current);
  };
  const begin = () => {
    if (active.current === 0) {
      start.current = el;
      current.current = el;
      onSelect();
    }
    active.current += 1;
  };
  const finish = () => {
    active.current = Math.max(0, active.current - 1);
    if (active.current > 0) return;
    onGuides({ x: false, y: false });
    const next = current.current;
    setLive(null);
    if (next !== el) onCommit(next);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => {
      const s = snapCenter(start.current.x + e.translationX / slideW, start.current.y + e.translationY / slideH);
      update({ x: s.x, y: s.y });
      onGuides({ x: s.guideX, y: s.guideY });
    })
    .onFinalize(finish);

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => update({ w: clampWidth(start.current.w * e.scale) }))
    .onFinalize(finish);

  const rotate = Gesture.Rotation()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => update({ rotation: snapRotation(start.current.rotation + (e.rotation * 180) / Math.PI) }))
    .onFinalize(finish);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => onDoubleTap());

  // 손잡이: 중심 → 손잡이 벡터의 길이 비율 = 크기, 각도 차 = 회전
  const handle = Gesture.Pan()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => {
      const s = start.current;
      const w0 = s.w * slideW;
      const h0 = boxH || w0;
      const r = rad(s.rotation);
      const vx = (w0 / 2) * Math.cos(r) - (h0 / 2) * Math.sin(r);
      const vy = (w0 / 2) * Math.sin(r) + (h0 / 2) * Math.cos(r);
      const nx = vx + e.translationX;
      const ny = vy + e.translationY;
      const scale = Math.hypot(nx, ny) / Math.hypot(vx, vy);
      const delta = ((Math.atan2(ny, nx) - Math.atan2(vy, vx)) * 180) / Math.PI;
      update({ w: clampWidth(s.w * scale), rotation: snapRotation(s.rotation + delta) });
    })
    .onFinalize(finish);

  const shown = live ?? el;
  const gesture = Gesture.Simultaneous(pan, pinch, rotate, doubleTap);

  return (
    <ElementView el={shown} content={content} slideW={slideW}>
      <GestureDetector gesture={gesture}>
        <View
          pointerEvents={interactive ? 'auto' : 'none'}
          style={selected ? styles.selected : undefined}
          accessibilityLabel="캔버스 요소"
        >
          <ElementContent el={shown} content={content} slideW={slideW} onLayout={(e) => setBoxH(e.nativeEvent.layout.height)} />
          {selected && interactive && (
            <GestureDetector gesture={handle}>
              <View style={styles.handle} accessibilityLabel="크기·회전 손잡이" />
            </GestureDetector>
          )}
        </View>
      </GestureDetector>
    </ElementView>
  );
}

const styles = StyleSheet.create({
  selected: { borderWidth: 1, borderColor: '#3750BE', borderStyle: 'dashed' },
  handle: {
    position: 'absolute',
    right: -HANDLE / 2,
    bottom: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3750BE',
  },
});
