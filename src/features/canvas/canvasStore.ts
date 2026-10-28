import { create } from 'zustand';

import { CANVAS_LIMITS } from './model';
import type { CanvasDoc } from './types';

export type CanvasTool = 'select' | 'pen' | 'eraser';

/** 캔버스 편집 중 상태 — 기록(되돌리기)은 저장하지 않는다 */
interface CanvasState {
  doc: CanvasDoc | null;
  selectedId: string | null;
  tool: CanvasTool;
  past: CanvasDoc[];
  future: CanvasDoc[];
  open: (doc: CanvasDoc) => void;
  close: () => void;
  select: (id: string | null) => void;
  setTool: (tool: CanvasTool) => void;
  /** 조작 한 번(끌기·핀치 등)이 끝났을 때 한 번만 부른다 */
  commit: (next: CanvasDoc) => void;
  undo: () => void;
  redo: () => void;
}

/** 선택한 요소가 문서에 없으면 선택을 푼다 */
const keepSelection = (doc: CanvasDoc, id: string | null) => (id && doc.elements.some((e) => e.id === id) ? id : null);

export const useCanvas = create<CanvasState>()((set) => ({
  doc: null,
  selectedId: null,
  tool: 'select',
  past: [],
  future: [],

  open: (doc) => set({ doc, selectedId: null, tool: 'select', past: [], future: [] }),
  close: () => set({ doc: null, selectedId: null, tool: 'select', past: [], future: [] }),
  select: (id) => set({ selectedId: id }),
  setTool: (tool) => set({ tool, selectedId: null }),

  commit: (next) =>
    set((s) => {
      if (!s.doc || next === s.doc) return s;
      return {
        doc: next,
        past: [...s.past, s.doc].slice(-CANVAS_LIMITS.history),
        future: [],
        selectedId: keepSelection(next, s.selectedId),
      };
    }),

  undo: () =>
    set((s) => {
      if (!s.doc || !s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], selectedId: keepSelection(prev, s.selectedId) };
    }),

  redo: () =>
    set((s) => {
      if (!s.doc || !s.future.length) return s;
      const [next, ...rest] = s.future;
      return { doc: next, past: [...s.past, s.doc], future: rest, selectedId: keepSelection(next, s.selectedId) };
    }),
}));
