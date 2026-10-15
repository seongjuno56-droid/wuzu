import { create } from 'zustand';

import {
  createInvitation,
  Invitation,
  InvitationContent,
  OptionalSection,
  ReorderablePage,
  SectionKey,
  validateSection,
} from './model';

/** 제작 중인 초대장 (Step3~5 공유). 저장은 invitationService 가 담당 */
interface EditorState {
  draft: Invitation | null;
  /** 마지막 저장 이후 바뀐 내용이 있는지 — 이탈 경고에 사용 */
  dirty: boolean;
  start: (args: { ownerId: string; themeId: string; templateId: string; today?: Date }) => void;
  load: (invitation: Invitation) => void;
  reset: () => void;
  setEnabled: (key: OptionalSection, value: boolean) => void;
  setOrder: (order: ReorderablePage[]) => void;
  patch: <K extends SectionKey>(key: K, values: Partial<InvitationContent[K]>) => void;
  /** 바텀시트 ✓: 유효하면 완료 처리 후 true */
  confirm: (key: SectionKey) => boolean;
  markSaved: (saved: Invitation) => void;
}

const newId = () => `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const useEditor = create<EditorState>()((set, get) => ({
  draft: null,
  dirty: false,

  start: ({ ownerId, themeId, templateId, today }) =>
    set({ draft: createInvitation({ id: newId(), ownerId, themeId, templateId, today }), dirty: false }),

  load: (invitation) => set({ draft: invitation, dirty: false }),

  reset: () => set({ draft: null, dirty: false }),

  setEnabled: (key, value) =>
    set((s) => (s.draft ? { draft: { ...s.draft, enabled: { ...s.draft.enabled, [key]: value } }, dirty: true } : s)),

  setOrder: (order) => set((s) => (s.draft ? { draft: { ...s.draft, order }, dirty: true } : s)),

  patch: (key, values) =>
    set((s) => {
      if (!s.draft) return s;
      const content = { ...s.draft.content, [key]: { ...s.draft.content[key], ...values } };
      // 완료했던 섹션이 다시 규칙에 어긋나면 완료 표시를 푼다
      const stillValid = validateSection(key, content).length === 0;
      const completed = s.draft.completed[key] && !stillValid ? { ...s.draft.completed, [key]: false } : s.draft.completed;
      return { draft: { ...s.draft, content, completed }, dirty: true };
    }),

  confirm: (key) => {
    const { draft } = get();
    if (!draft || validateSection(key, draft.content).length) return false;
    set({ draft: { ...draft, completed: { ...draft.completed, [key]: true } }, dirty: true });
    return true;
  },

  markSaved: (saved) => set({ draft: saved, dirty: false }),
}));
