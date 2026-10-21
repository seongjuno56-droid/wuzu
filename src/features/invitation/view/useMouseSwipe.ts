import { RefObject, useEffect, useRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { isTypingTarget, releasePage } from './storyNav';

/** 끌기로 보기 전 허용하는 흔들림(px) */
const SLOP = 6;
/** 놓은 뒤 붙는 애니메이션이 끝날 즈음 스냅을 되살린다 */
const SNAP_RESTORE_MS = 450;

/**
 * 웹 마우스로 끌어 넘기기. 브라우저는 마우스 끌기를 가로 스크롤로 처리하지 않아
 * 터치·트랙패드와 달리 넘어가지 않는다 — 끄는 동안 슬라이드가 마우스를 따라오고,
 * 놓으면 releasePage 가 고른 장으로 부드럽게 붙는다(onRelease 가 animated scrollTo).
 * - justDragged(): 방금 끌었으면 true 를 한 번 — 끈 뒤의 눌림을 탭으로 처리하지 않게
 * - isDragging(): 끄는 중 — 그동안 onScroll 의 장 번호 갱신을 멈추게
 */
export function useMouseSwipe(opts: {
  root: RefObject<View | null>;
  scroller: RefObject<ScrollView | null>;
  pageWidth: number;
  count: number;
  onRelease: (page: number) => void;
}) {
  const latest = useRef(opts);
  const dragged = useRef(false);
  const dragging = useRef(false);
  useEffect(() => {
    latest.current = opts;
  });
  const { root } = opts;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = root.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    let start: { x: number; y: number; scroll: number; node: HTMLElement } | null = null;
    let restore: ReturnType<typeof setTimeout> | undefined;

    const scrollNode = () => {
      const s = latest.current.scroller.current as unknown as { getScrollableNode?: () => HTMLElement } | null;
      return s?.getScrollableNode?.() ?? null;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || isTypingTarget(e.target)) return;
      const node = scrollNode();
      if (!node) return;
      start = { x: e.clientX, y: e.clientY, scroll: node.scrollLeft, node };
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging.current) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        // 세로로 먼저 움직이면 넘김이 아니다
        if (Math.abs(dy) > Math.abs(dx)) {
          start = null;
          return;
        }
        dragging.current = true;
        dragged.current = true;
        clearTimeout(restore);
        // 스냅이 켜져 있으면 손을 따라가지 못하고 장 경계로 튄다
        start.node.style.scrollSnapType = 'none';
        start.node.style.scrollBehavior = 'auto';
        document.body.style.cursor = 'grabbing';
      }
      e.preventDefault(); // 끄는 동안 글자가 선택되지 않게
      start.node.scrollLeft = start.scroll - dx;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const { node } = start;
      const wasDragging = dragging.current;
      const { pageWidth, count, onRelease } = latest.current;
      const from = pageWidth > 0 ? Math.round(start.scroll / pageWidth) : 0;
      const page = releasePage(from, e.clientX - start.x, e.clientY - start.y, pageWidth, count);
      start = null;
      dragging.current = false;
      if (!wasDragging) return;
      document.body.style.cursor = '';
      node.style.scrollBehavior = '';
      onRelease(page);
      restore = setTimeout(() => {
        node.style.scrollSnapType = '';
      }, SNAP_RESTORE_MS);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      clearTimeout(restore);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [root]);

  return {
    justDragged: () => {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
    isDragging: () => dragging.current,
  };
}
