import { create } from 'zustand';

import { styleFor } from '../../data/templates';
import { coverPreset } from '../canvas/preset';
import type { CanvasDoc, ViewMode } from '../canvas/types';
import { pruneAccounts, seedTimeline } from './dol';
import { isDateString } from './model';
import { Invitation, InvitationContent, isDol, OptionalSection, PageKey, ReorderablePage, SectionKey } from './model';
import { createInvitation, themeDef, validateFor } from './themes';

/** 제작 중인 초대장 (Step3~5 공유). 저장은 invitationService 가 담당 */
interface EditorState {
  draft: Invitation | null;
  /** 마지막 저장 이후 바뀐 내용이 있는지 — 이탈 경고에 사용 */
  dirty: boolean;
  /** 나의 초대장에서 불러온 저장본 (수정 모드 판단용). 새로 만들면 null */
  origin: Invitation | null;
  start: (args: { ownerId: string; themeId: string; templateId: string; today?: Date; viewMode?: ViewMode }) => void;
  load: (invitation: Invitation) => void;
  /** 서버의 최신 저장본으로 기준만 바꾼다 (편집 중 내용은 그대로) — 다른 곳에서 활성화된 경우 등 */
  setOrigin: (invitation: Invitation) => void;
  reset: () => void;
  setEnabled: (key: OptionalSection, value: boolean) => void;
  setOrder: (order: ReorderablePage[]) => void;
  /** 섹션 값 일부 바꾸기 — 값의 모양은 테마·섹션마다 다르다 */
  patch: (key: SectionKey, values: object) => void;
  /** 바텀시트 ✓: 유효하면 완료 처리 후 true */
  confirm: (key: SectionKey) => boolean;
  setViewMode: (mode: ViewMode) => void;
  /** 배경 색 조합 (null 이면 템플릿 색) */
  setPalette: (paletteId: string | null) => void;
  /** [직접 꾸미기]: 템플릿 프리셋 복사본으로 캔버스 시작 */
  startCanvas: (page: PageKey) => void;
  /** 캔버스 편집기 [완료] */
  applyCanvas: (page: PageKey, doc: CanvasDoc) => void;
  /** [템플릿 원래대로]: 형식으로 되돌림 */
  resetDesign: (page: PageKey) => void;
  markSaved: (saved: Invitation) => void;
}

const newId = () => `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const useEditor = create<EditorState>()((set, get) => ({
  draft: null,
  dirty: false,
  origin: null,

  start: ({ ownerId, themeId, templateId, today, viewMode }) =>
    set({
      draft: createInvitation({ id: newId(), ownerId, themeId, templateId, today, viewMode }),
      dirty: false,
      origin: null,
    }),

  load: (invitation) => set({ draft: invitation, dirty: false, origin: invitation }),

  setOrigin: (invitation) => set({ origin: invitation }),

  reset: () => set({ draft: null, dirty: false, origin: null }),

  setEnabled: (key, value) =>
    set((s) => (s.draft ? { draft: { ...s.draft, enabled: { ...s.draft.enabled, [key]: value } }, dirty: true } : s)),

  setOrder: (order) => set((s) => (s.draft ? { draft: { ...s.draft, order }, dirty: true } : s)),

  patch: (key, values) =>
    set((s) => {
      if (!s.draft) return s;
      const prev = (s.draft.content as unknown as Record<string, object>)[key];
      let content = { ...s.draft.content, [key]: { ...prev, ...values } } as InvitationContent;
      // 돌잔치 성장 이야기 미리 채우기 (설계 3장)
      //  - 비어 있으면: 태어난 날을 처음 넣는 순간에만 4개를 만든다 (다 지운 뒤 다른 칸을 고쳐도 되살리지 않는다)
      //  - 있으면: 태어난 날·행사일이 바뀔 때 고치지 않은 예시 항목의 날짜만 다시 맞춘다
      if (isDol(content) && isDol(s.draft.content) && (key === 'basic' || key === 'ceremony')) {
        const before = s.draft.content;
        const items = content.timeline.items;
        const firstBirthDate = !isDateString(before.basic.birthDate) && isDateString(content.basic.birthDate);
        if (items.length || firstBirthDate) {
          content = {
            ...content,
            timeline: { items: seedTimeline(items, content.basic.birthDate, content.ceremony.date) },
          };
        }
      }
      // 돌잔치 보호자를 지우면 그 보호자의 계좌도 같이 지운다 (저장본에 남지 않게)
      if (isDol(content) && key === 'basic') {
        content = { ...content, account: { ...content.account, accounts: pruneAccounts(content) } };
      }
      // 완료했던 섹션이 다시 규칙에 어긋나면 완료 표시를 푼다 — 다른 칸을 바꿔 어긋날 수도 있어 완료된 칸을 모두 다시 본다
      // (예: 계좌를 넣은 보호자를 지움, 행사일을 태어난 날보다 앞으로 옮김)
      const def = themeDef(s.draft.themeId);
      const completed = { ...s.draft.completed };
      for (const k of Object.keys(completed) as SectionKey[]) {
        if (completed[k] && def.validate(k, content).length) completed[k] = false;
      }
      return { draft: { ...s.draft, content, completed }, dirty: true };
    }),

  confirm: (key) => {
    const { draft } = get();
    if (!draft || validateFor(draft, key).length) return false;
    set({ draft: { ...draft, completed: { ...draft.completed, [key]: true } }, dirty: true });
    return true;
  },

  setPalette: (paletteId) => set((s) => (s.draft ? { draft: { ...s.draft, paletteId }, dirty: true } : s)),

  setViewMode: (mode) => set((s) => (s.draft ? { draft: { ...s.draft, viewMode: mode }, dirty: true } : s)),

  startCanvas: (page) =>
    set((s) => {
      if (!s.draft) return s;
      const preset = coverPreset(styleFor(s.draft.themeId, s.draft.templateId, s.draft.paletteId), s.draft.themeId);
      // 프리셋 원본이 바뀌지 않도록 깊은 복사
      const canvas = JSON.parse(JSON.stringify(preset)) as CanvasDoc;
      return { draft: { ...s.draft, design: { ...s.draft.design, [page]: { mode: 'canvas', canvas } } }, dirty: true };
    }),

  applyCanvas: (page, doc) =>
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, design: { ...s.draft.design, [page]: { mode: 'canvas', canvas: doc } } }, dirty: true }
        : s,
    ),

  resetDesign: (page) =>
    set((s) => {
      if (!s.draft) return s;
      const { [page]: _removed, ...design } = s.draft.design;
      return { draft: { ...s.draft, design }, dirty: true };
    }),

  markSaved: (saved) => set({ draft: saved, dirty: false, origin: saved }),
}));
