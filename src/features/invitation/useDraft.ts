import { useEditor } from './editorStore';

/** 편집 중인 초대장 (없으면 null — 화면에서 제작 시작으로 돌려보낸다) */
export function useDraft() {
  return useEditor((s) => s.draft);
}
