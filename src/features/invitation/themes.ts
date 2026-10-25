/**
 * 테마별 초대장 구성 정의 — 입력 탭·입력항목 선택·기본값·검사·라벨을 테마가 정한다.
 * (설계: docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md 2장)
 * 돌잔치 등은 각자 파일에서 registerTheme 으로 등록한다 (registerThemes.ts).
 */
import type { ViewMode } from '../canvas/types';
import {
  defaultContent,
  defaultEnding,
  DEFAULT_ENABLED,
  DEFAULT_ORDER,
  EnabledSections,
  Invitation,
  InvitationContent,
  newInvitationNumber,
  OptionalSection,
  PAGE_LABEL,
  PageKey,
  ReorderablePage,
  SECTION_LABEL,
  SectionKey,
  validateSection,
} from './model';

export interface SectionCopy {
  key: SectionKey;
  title: string;
  body: string;
}

export interface ThemeDef {
  id: string;
  /** 늘 있는 입력 탭 (입력항목 선택에 '필수'로 보임) */
  fixed: SectionCopy[];
  /** 켜고 끌 수 있는 입력 탭 */
  optional: (SectionCopy & { key: OptionalSection })[];
  defaultEnabled: EnabledSections;
  defaultOrder: ReorderablePage[];
  createContent: (today: Date) => InvitationContent;
  /** 엔딩 [기본 문구 넣기] — 사용자 언어로 */
  defaultEnding: () => string;
  validate: (key: SectionKey, c: InvitationContent) => string[];
  sectionLabel: (key: SectionKey) => string;
  pageLabel: (page: PageKey) => string;
}

const wedding: ThemeDef = {
  id: 'wedding',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '신랑측, 신부측 정보를 입력합니다.' },
    { key: 'ceremony', title: '예식 정보', body: '예식장 위치, 예식 진행 시간을 입력합니다.' },
    { key: 'greeting', title: '인사말', body: '소중한 하객분에게 드릴 인사말을 입력합니다.' },
  ],
  optional: [
    { key: 'account', title: '계좌번호', body: '신랑측, 신부측의 계좌정보를 제공합니다.' },
    { key: 'gallery', title: '갤러리', body: '웨딩 촬영 등 갤러리 영역을 제공합니다.' },
    { key: 'guestbook', title: '방명록', body: '방명록 기능을 제공합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: DEFAULT_ENABLED,
  defaultOrder: DEFAULT_ORDER,
  createContent: (today) => defaultContent(today),
  defaultEnding,
  validate: validateSection,
  sectionLabel: (k) => SECTION_LABEL[k],
  pageLabel: (p) => PAGE_LABEL[p],
};

const DEFS: Record<string, ThemeDef> = { wedding };

export function registerTheme(def: ThemeDef) {
  DEFS[def.id] = def;
}

/** 모르는 테마 id 면 결혼식 정의 (앱이 멈추지 않게) */
export const themeDef = (themeId: string): ThemeDef => DEFS[themeId] ?? wedding;

/** 입력 탭: 고정 + 사용 중인 선택 섹션 (정의 순서) */
export function sectionTabs(inv: Pick<Invitation, 'themeId' | 'enabled'>): SectionKey[] {
  const def = themeDef(inv.themeId);
  return [...def.fixed.map((s) => s.key), ...def.optional.filter((s) => inv.enabled[s.key]).map((s) => s.key)];
}

export const validateFor = (inv: Pick<Invitation, 'themeId' | 'content'>, key: SectionKey) =>
  themeDef(inv.themeId).validate(key, inv.content);

/** 최종저장 가능: 사용 중인 모든 탭이 ✓ 확인 완료 */
export const canFinalize = (inv: Invitation) => sectionTabs(inv).every((k) => inv.completed[k]);

export function createInvitation(args: {
  id: string;
  ownerId: string;
  themeId: string;
  templateId: string;
  today?: Date;
  viewMode?: ViewMode;
}): Invitation {
  const def = themeDef(args.themeId);
  const now = (args.today ?? new Date()).toISOString();
  return {
    id: args.id,
    ownerId: args.ownerId,
    themeId: args.themeId,
    templateId: args.templateId,
    name: '',
    number: newInvitationNumber(),
    status: 'draft',
    enabled: { ...def.defaultEnabled },
    order: [...def.defaultOrder],
    content: def.createContent(args.today ?? new Date()),
    viewMode: args.viewMode ?? 'story',
    design: {},
    completed: {},
    createdAt: now,
    updatedAt: now,
  };
}
