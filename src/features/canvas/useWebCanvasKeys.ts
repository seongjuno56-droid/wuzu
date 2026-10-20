import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { fromPasteEvent, PasteResult } from './paste';

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

/** 웹: Delete/Backspace 삭제, Ctrl+Z 되돌리기, Ctrl+Shift+Z·Ctrl+Y 다시하기, Ctrl+V 붙여넣기 */
export function useWebCanvasKeys(handlers: {
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPaste: (r: PasteResult) => void;
}) {
  // 매 렌더 바뀌는 콜백을 다시 등록하지 않도록 ref 로 둔다
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        h.current.onDelete();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) h.current.onRedo();
        else h.current.onUndo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        h.current.onRedo();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (typing(e.target)) return;
      e.preventDefault();
      fromPasteEvent(e).then((r) => h.current.onPaste(r));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, []);
}
