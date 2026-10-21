import { RefObject, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { isTypingTarget, SWIPE_MIN, swipeStep } from './storyNav';

/**
 * 웹 마우스로 끌어 넘기기. 브라우저는 마우스 끌기를 가로 스크롤로 처리하지 않아
 * 터치·트랙패드와 달리 넘어가지 않는다 — 놓을 때 끈 방향으로 한 장 넘긴다.
 * 돌려주는 함수는 방금 끌었는지(끈 뒤 눌림을 탭으로 처리하지 않도록) 알려 준다.
 */
export function useMouseSwipe(target: RefObject<View | null>, onStep: (step: -1 | 1) => void) {
  const latest = useRef(onStep);
  const dragged = useRef(false);
  useEffect(() => {
    latest.current = onStep;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = target.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || isTypingTarget(e.target)) return;
      start = { x: e.clientX, y: e.clientY };
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (start && Math.abs(e.clientX - start.x) >= SWIPE_MIN / 2) {
        dragged.current = true;
        e.preventDefault(); // 끄는 동안 글자가 선택되지 않게
      }
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const step = swipeStep(e.clientX - start.x, e.clientY - start.y);
      start = null;
      if (step) latest.current(step);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [target]);

  /** 방금 끌었으면 true 를 한 번 돌려주고 지운다 */
  return () => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  };
}
