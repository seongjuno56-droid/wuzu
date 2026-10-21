# 테마 공통 구조 + 돌잔치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초대장 구성을 테마별로 정의할 수 있게 바꾸고(결혼식 동작 그대로), 그 위에 돌잔치 초대장을 결혼식과 같은 수준으로 만든다.

**Architecture:** 초대장 콘텐츠를 `WeddingContent | DolContent` 로 나누고 `theme` 필드로 구분한다. 섹션 키는 결혼식과 같은 이름(basic·ceremony·greeting·account·gallery·guestbook·ending·bgm)을 최대한 재사용하고 돌잔치 전용 profile·timeline 을 더한다. 테마 정의(`themes.ts`)가 입력 탭·입력항목 선택·검사·기본값·라벨을 내주고, 입력 시트와 하객 화면은 테마에 따라 폼·장 부품을 고른다.

**Tech Stack:** Expo SDK 57, expo-router, React Native + react-native-web, TypeScript, Zustand, Jest(jest-expo), react-native-gesture-handler.

**Spec:** `docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md` (1·2·3·7·9·10장, 11장의 1~2단계)

## Global Constraints

- 결혼식 화면과 데이터는 바뀌지 않는다. 이미 만든 결혼식 초대장은 그대로 열린다(저장본에 `theme` 필드가 없어도 결혼식으로 본다).
- 패키지는 `npx expo install` 로만 설치. `ios/`·`android/` 폴더를 만들지 않는다.
- 완료 전 `npx tsc --noEmit`, `npx jest`, `npx expo lint`(기존 23 errors / 7 warnings 보다 늘면 안 됨).
- 대화·주석·커밋은 한국어. 커밋 끝 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. main 병합·푸시 금지.
- 새 화면 문구는 모두 `src/i18n/en/*.ts` 에 영어를 넣는다(누락 검사 테스트가 막는다). 사용자 글은 `raw` 로 번역하지 않는다.
- prettier 는 `--single-quote --print-width 120` 으로, 고친 파일만.
- 돌잔치 한도: 보호자 1~4명, 해시태그 최대 5개(각 10자), 성장 이야기 최대 6개, 아이 이름 10자, 관계 10자, 소개 300자, 항목 제목 20자·한 줄 60자.

## Review Focus

1. 옛 결혼식 저장본(`content.theme` 없음) — 결혼식으로 열리고 검사·장 순서가 전과 같아야 한다 → Task 1·2 테스트.
2. 돌잔치에서 태어난 날을 다시 바꿈 — 이미 사용자가 고친 성장 이야기 항목은 덮어쓰지 않는다 → Task 4 테스트.
3. 보호자를 지움 — 그 보호자의 계좌 줄도 사라지고 남은 계좌로 검사한다 → Task 4 테스트.
4. 알 수 없는 테마 id 의 초대장 — 앱이 멈추지 않고 결혼식 정의로 대신 연다 → Task 2 테스트.
5. 표지 사진이 비어 있는 돌잔치 — 표지는 빈 사진 틀(안내)로 그리고, 기본정보에 빨간 점 → Task 4·6 테스트.

---

### Task 1: 콘텐츠 타입을 테마별로 나누기

**Files:**
- Modify: `src/features/invitation/model.ts`
- Modify: 결혼식 전용 부품들 (아래 Step 4 목록)
- Test: `src/features/invitation/__tests__/themeContent.test.ts`

**Interfaces:**
- Produces:
  - `export interface WeddingContent { theme?: 'wedding'; basic: BasicInfo; ceremony: CeremonyInfo; greeting: GreetingInfo; account: AccountInfo; gallery: GalleryInfo; guestbook: GuestbookSettings; ending: EndingInfo; bgm: BgmInfo }`
  - `export interface DolContent { theme: 'dol'; basic: DolBasic; ceremony: CeremonyInfo; greeting: GreetingInfo; profile: DolProfile; timeline: DolTimeline; account: DolAccount; gallery: GalleryInfo; guestbook: GuestbookSettings; ending: EndingInfo; bgm: BgmInfo }`
  - `export type InvitationContent = WeddingContent | DolContent`
  - `export const isDol = (c: InvitationContent): c is DolContent => c.theme === 'dol'`
  - `export const asWedding = (c: InvitationContent): WeddingContent` (돌잔치면 오류를 던진다 — 결혼식 전용 부품에서만)
  - `SectionKey` 에 `'profile' | 'timeline'`, `PageKey`·`ReorderablePage`·`OptionalSection` 에 `'profile' | 'timeline'` 추가. `EnabledSections = Partial<Record<OptionalSection, boolean>>`.
  - 돌잔치 타입: `Guardian { id: string; relation: string; name: string }`, `DolBasic { childName: string; nickname: string; birthDate: string; photo: string | null; guardians: Guardian[] }`, `DolProfile { photo: string | null; intro: string; hashtags: string[] }`, `TimelineItem { id: string; photo: string | null; date: string; title: string; text: string; edited: boolean }`, `DolTimeline { items: TimelineItem[] }`, `DolAccount { message: string; accounts: Record<string, BankAccount> }` (키 = 보호자 id)

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/invitation/__tests__/themeContent.test.ts
import { asWedding, defaultContent, isDol, InvitationContent } from '../model';

describe('테마별 콘텐츠', () => {
  it('theme 필드가 없는 옛 저장본은 결혼식', () => {
    const old = defaultContent() as InvitationContent;
    delete (old as { theme?: string }).theme;
    expect(isDol(old)).toBe(false);
    expect(asWedding(old).basic.groom.title).toBe('아들');
  });
  it('돌잔치 콘텐츠를 결혼식으로 읽으려 하면 오류', () => {
    const dol = { theme: 'dol' } as InvitationContent;
    expect(isDol(dol)).toBe(true);
    expect(() => asWedding(dol)).toThrow('결혼식 초대장이 아니에요');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/themeContent.test.ts` / Expected: FAIL (`isDol`·`asWedding` 없음)

- [ ] **Step 3: 타입·가드 구현** (`model.ts`)
  - `export interface InvitationContent {…}` 를 `export interface WeddingContent { theme?: 'wedding'; …같은 필드… }` 로 이름만 바꾼다.
  - 위 Interfaces 의 돌잔치 타입들과 `DolContent`, `InvitationContent` 합집합, `isDol`, `asWedding` 를 추가한다.

```ts
export const isDol = (c: InvitationContent): c is DolContent => c.theme === 'dol';
/** 결혼식 전용 부품에서만 쓴다 — 돌잔치가 들어오면 화면 연결이 잘못된 것 */
export function asWedding(c: InvitationContent): WeddingContent {
  if (isDol(c)) throw new Error('결혼식 초대장이 아니에요');
  return c;
}
```
  - `defaultContent()` 반환 타입을 `WeddingContent` 로, 키 합집합을 위처럼 넓히고 `SECTION_LABEL`·`PAGE_LABEL` 에 `profile: '아이 프로필'`, `timeline: '성장 이야기'` 를 더한다.
  - `validateSection(key, c)` 는 `asWedding(c)` 로 받아 기존 그대로 검사하고, `profile`·`timeline` 케이스는 빈 배열(Task 4 에서 돌잔치 검사로 분기).
  - `pageOrder(enabled, order)` 의 `enabled[p]` 는 `!!enabled[p]` 로.

- [ ] **Step 4: 타입 오류 정리** — Run: `npx tsc --noEmit`. 결혼식 전용 부품은 `asWedding(...)` 으로 좁힌다:
  - `editor/TextForms.tsx`, `editor/CeremonyForm.tsx`, `editor/MediaForms.tsx`: `const useContent = () => useEditor((s) => s.draft!.content)` → `useEditor((s) => asWedding(s.draft!.content))`. 단, `CeremonyForm`·`MediaForms`(갤러리·엔딩·BGM)는 돌잔치도 쓰므로 `s.draft!.content.ceremony` 처럼 공통 필드만 읽게 바꾼다(두 타입 모두 같은 필드).
  - `view/GreetingPage.tsx`·`view/AccountPage.tsx`: Task 8 에서 테마 분기하므로 지금은 `asWedding(content)`.
  - `canvas/model.ts` `resolveBind`: 지금은 `asWedding(c)` (Task 6 에서 돌잔치 분기).
  - `editorStore.patch`: `{ ...s.draft.content, [key]: { ...(s.draft.content as Record<string, object>)[key], ...values } } as InvitationContent`, 시그니처는 `patch: (key: SectionKey, values: object) => void`.
  - `sample.ts`: `const c = asWedding(inv.content)`.
  - 결혼식 전용 타입을 쓰는 다른 곳도 같은 방식. **테스트 파일**에서 `defaultContent()` 를 결혼식으로 쓰는 곳은 그대로 통과해야 한다.

- [ ] **Step 5: 확인** — Run: `npx tsc --noEmit && npx jest` / Expected: 오류 0, 전체 통과(기존 249 + 2)

- [ ] **Step 6: 커밋**
```bash
git add src && git commit -m "refactor: 초대장 콘텐츠를 테마별 타입으로 나누기 (결혼식 동작 그대로)"
```

---

### Task 2: 테마 정의와 공통 엔진

**Files:**
- Create: `src/features/invitation/themes.ts`
- Modify: `src/features/invitation/model.ts` (`sectionTabs`·`canFinalize`·`createInvitation` 이 테마 정의를 쓴다)
- Modify: `src/features/invitation/editorStore.ts`, `src/app/create/editor/options.tsx`, `src/app/create/editor/compose.tsx`, `src/features/invitation/editor/SectionSheet.tsx`
- Test: `src/features/invitation/__tests__/themes.test.ts`

**Interfaces:**
- Consumes: Task 1 타입
- Produces:
```ts
export interface SectionCopy { key: SectionKey; title: string; body: string }
export interface ThemeDef {
  id: 'wedding' | 'dol';
  /** 늘 있는 입력 탭 (입력항목 선택에 '필수'로 보임) */
  fixed: SectionCopy[];
  /** 켜고 끌 수 있는 입력 탭 */
  optional: (SectionCopy & { key: OptionalSection })[];
  defaultEnabled: EnabledSections;
  defaultOrder: ReorderablePage[];
  createContent: (today: Date) => InvitationContent;
  validate: (key: SectionKey, c: InvitationContent) => string[];
  sectionLabel: (key: SectionKey) => string;
  pageLabel: (page: PageKey) => string;
}
export function themeDef(themeId: string): ThemeDef   // 모르는 id 면 결혼식
export function sectionTabs(inv: Pick<Invitation, 'themeId' | 'enabled'>): SectionKey[]
export function validateFor(inv: Pick<Invitation, 'themeId' | 'content'>, key: SectionKey): string[]
```
  - `model.ts` 의 `canFinalize(inv)` 는 `themes.sectionTabs(inv)` 를 쓴다. `createInvitation` 은 `themeDef(themeId)` 의 `createContent`·`defaultEnabled`·`defaultOrder` 를 쓴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/invitation/__tests__/themes.test.ts
import { createInvitation, DEFAULT_ENABLED, DEFAULT_ORDER } from '../model';
import { sectionTabs, themeDef, validateFor } from '../themes';

describe('테마 정의', () => {
  it('결혼식: 입력 탭·기본값이 전과 같다', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' });
    expect(sectionTabs(inv)).toEqual(['basic', 'ceremony', 'greeting', 'account', 'gallery', 'guestbook', 'ending']);
    expect(inv.enabled).toEqual(DEFAULT_ENABLED);
    expect(inv.order).toEqual(DEFAULT_ORDER);
    expect(validateFor(inv, 'basic')).toEqual(['groom', 'bride']);
  });
  it('모르는 테마 id 는 결혼식 정의로 연다 (앱이 멈추지 않게)', () => {
    expect(themeDef('nope').id).toBe('wedding');
  });
  it('결혼식 라벨', () => {
    expect(themeDef('wedding').sectionLabel('ceremony')).toBe('예식정보');
    expect(themeDef('wedding').pageLabel('ceremony')).toBe('예식 정보');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/themes.test.ts` / Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현** — `themes.ts`

```ts
/** 테마별 초대장 구성 정의 — 입력 탭·입력항목 선택·기본값·검사·라벨을 테마가 정한다 (설계 2장) */
import {
  defaultContent,
  DEFAULT_ENABLED,
  DEFAULT_ORDER,
  EnabledSections,
  Invitation,
  InvitationContent,
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
  id: 'wedding' | 'dol';
  fixed: SectionCopy[];
  optional: (SectionCopy & { key: OptionalSection })[];
  defaultEnabled: EnabledSections;
  defaultOrder: ReorderablePage[];
  createContent: (today: Date) => InvitationContent;
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
  validate: validateSection,
  sectionLabel: (k) => SECTION_LABEL[k],
  pageLabel: (p) => PAGE_LABEL[p],
};

const DEFS: Record<string, ThemeDef> = { wedding };

/** 돌잔치 정의는 Task 4 에서 등록한다 */
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
```

  - `model.ts`: 기존 `sectionTabs(enabled)` 와 `FIXED_TABS`·`OPTIONAL_TABS` 를 지우고, `canFinalize(inv)` 를 `themes.ts` 로 옮긴다(`model.ts` → `themes.ts` 순환 import 를 피하려고 `canFinalize` 는 `themes.ts` 에 두고 사용처 import 를 바꾼다). `createInvitation` 도 `themes.ts` 로 옮긴다:

```ts
export function createInvitation(args: { id: string; ownerId: string; themeId: string; templateId: string; today?: Date; viewMode?: ViewMode }): Invitation {
  const def = themeDef(args.themeId);
  const now = (args.today ?? new Date()).toISOString();
  return {
    id: args.id, ownerId: args.ownerId, themeId: args.themeId, templateId: args.templateId,
    name: '', number: newInvitationNumber(), status: 'draft',
    enabled: { ...def.defaultEnabled }, order: [...def.defaultOrder],
    content: def.createContent(args.today ?? new Date()),
    viewMode: args.viewMode ?? 'story', design: {}, completed: {}, createdAt: now, updatedAt: now,
  };
}
export const canFinalize = (inv: Invitation) => sectionTabs(inv).every((k) => inv.completed[k]);
```
  - 사용처 import 를 `themes` 로 바꾼다: `editorStore.ts`(`createInvitation`, `validateFor` — `patch`·`confirm` 의 `validateSection(key, content)` → `themeDef(draft.themeId).validate(key, content)`), `compose.tsx`(`sectionTabs(draft)`, `canFinalize`), `SectionSheet.tsx`(`validateFor(draft, section)`, 제목 `themeDef(draft.themeId).sectionLabel(section)`), 테스트 파일들(`createInvitation` import 경로).
  - `options.tsx`: `FIXED`·`OPTIONAL` 상수를 지우고 `const def = themeDef(draft.themeId)` 의 `def.fixed`·`def.optional` 로 그린다(`draft.enabled[o.key]` → `!!draft.enabled[o.key]`).

- [ ] **Step 4: 확인** — Run: `npx tsc --noEmit && npx jest` / Expected: 오류 0, 전체 통과

- [ ] **Step 5: 커밋**
```bash
git add src && git commit -m "refactor: 테마 정의로 입력 탭·입력항목 선택·검사·기본값을 정한다"
```

---

### Task 3: 목록형 입력 계산과 부품

**Files:**
- Create: `src/features/invitation/editor/listOps.ts`, `src/features/invitation/editor/ListEditor.tsx`
- Test: `src/features/invitation/__tests__/listOps.test.ts`

**Interfaces:**
- Produces:
```ts
export function addItem<T>(list: T[], item: T, max: number): T[]          // max 면 그대로
export function removeItem<T extends { id: string }>(list: T[], id: string): T[]
export function updateItem<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[]
export const newItemId: () => string
// ListEditor: 항목 카드 목록 + [+ 추가] (max 면 끄고 '최대 N개까지'), 카드 머리에 ☰ 끌기·× 삭제
export function ListEditor<T extends { id: string }>(props: {
  items: T[]; max: number; addLabel: string;
  onAdd: () => void; onChange: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  onDragChange?: (dragging: boolean) => void;
}): JSX.Element
```

- [ ] **Step 1: 실패하는 테스트**

```ts
import { addItem, removeItem, updateItem } from '../editor/listOps';

const a = { id: 'a', v: 1 };
const b = { id: 'b', v: 2 };

describe('목록형 입력', () => {
  it('최대 개수면 더하지 않는다', () => {
    expect(addItem([a], b, 2)).toEqual([a, b]);
    expect(addItem([a, b], { id: 'c', v: 3 }, 2)).toEqual([a, b]);
  });
  it('지우기·고치기는 id 로', () => {
    expect(removeItem([a, b], 'a')).toEqual([b]);
    expect(updateItem([a, b], 'b', { v: 9 })).toEqual([a, { id: 'b', v: 9 }]);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/listOps.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현** — `listOps.ts`

```ts
/** 목록형 입력(보호자·성장 이야기 등) 계산 — 화면과 떼어 테스트한다 */
export const addItem = <T>(list: T[], item: T, max: number): T[] => (list.length >= max ? list : [...list, item]);
export const removeItem = <T extends { id: string }>(list: T[], id: string): T[] => list.filter((x) => x.id !== id);
export const updateItem = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));
export const newItemId = () => `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
```

  `ListEditor.tsx` — 기존 `SortableGrid`(columns=1, 손잡이)로 카드 순서를 바꾼다. 카드 높이가 내용마다 달라 `SortableGrid` 의 고정 `itemHeight` 가 맞지 않으므로 **순서 바꾸기는 ↑↓ 버튼**으로 한다(카드 머리 오른쪽: ↑ ↓ ×). 머리 왼쪽에 `${index + 1}`.

```tsx
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { moveItem } from '../../../lib/sortable';
import { colors, radius, spacing } from '../../../theme';
import { removeItem } from './listOps';

/** 카드 목록 + [+ 추가]. 순서는 ↑↓, 삭제는 × */
export function ListEditor<T extends { id: string }>({
  items,
  max,
  addLabel,
  onAdd,
  onChange,
  renderItem,
}: {
  items: T[];
  max: number;
  addLabel: string;
  onAdd: () => void;
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const full = items.length >= max;
  const btn = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, disabled = false) => (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={name} size={18} color={disabled ? colors.placeholder : colors.inkSoft} />
    </Pressable>
  );
  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.head}>
            <Txt variant="caption" weight="semibold" color={colors.muted}>
              {`${i + 1}`}
            </Txt>
            <View style={styles.actions}>
              {btn('arrow-up', '위로', () => onChange(moveItem(items, i, i - 1)), i === 0)}
              {btn('arrow-down', '아래로', () => onChange(moveItem(items, i, i + 1)), i === items.length - 1)}
              {btn('close', '삭제', () => onChange(removeItem(items, item.id)))}
            </View>
          </View>
          {renderItem(item, i)}
        </View>
      ))}
      <Pressable
        onPress={onAdd}
        disabled={full}
        style={[styles.add, full && styles.addOff]}
        accessibilityRole="button"
        accessibilityState={{ disabled: full }}
      >
        <Txt variant="caption" weight="semibold" color={full ? colors.placeholder : colors.brand}>
          {`+ ${addLabel}`}
        </Txt>
      </Pressable>
      <Txt variant="tiny" color={colors.faint}>
        {`최대 ${max}개까지 넣을 수 있어요.`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.canvas },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.lg },
  add: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.brand, borderStyle: 'dashed' },
  addOff: { borderColor: colors.hairline },
});
```
  Ruling(계획 단계): 설계의 "끌어 순서 바꾸기"를 목록형 입력에서는 ↑↓ 버튼으로 바꾼다 — 카드 높이가 달라 기존 SortableGrid 가 맞지 않음 — 비용: 끌기보다 한 번씩 눌러야 함.

  i18n: `'+ {0}'`(짧은 패턴, 끼어든 값이 글자라 안 걸림 — `addLabel` 은 이미 번역된 값을 넘기지 말고 한국어를 넘긴 뒤 `Txt` 가 문장 전체를 번역하도록 `{`+ ${addLabel}`}` 대신 두 조각 `+ ` 와 `{addLabel}` 로 나눠 `Txt` 에 넣는다), `'최대 {0}개까지 넣을 수 있어요.': 'Up to {0} items.'`, `위로: 'Up'`, `아래로: 'Down'`. (`+ ` 조각은 한글이 없어 번역 대상 아님)

- [ ] **Step 4: 확인** — Run: `npx jest src/features/invitation/__tests__/listOps.test.ts && npx tsc --noEmit` / Expected: PASS, 오류 0

- [ ] **Step 5: 커밋**
```bash
git add src && git commit -m "feat: 목록형 입력 계산과 카드 목록 부품"
```

---

### Task 4: 돌잔치 콘텐츠·검사·성장 이야기 미리 채우기·테마 등록

**Files:**
- Create: `src/features/invitation/dol.ts`
- Modify: `src/features/invitation/themes.ts` (돌잔치 등록), `src/features/invitation/model.ts` (`validateSection` 의 profile·timeline 케이스 제거 → 돌잔치 검사로)
- Test: `src/features/invitation/__tests__/dol.test.ts`

**Interfaces:**
- Consumes: Task 1 타입, Task 2 `registerTheme`, Task 3 `newItemId`
- Produces:
```ts
export const DOL_LIMITS = { name: 10, relation: 10, guardians: 4, hashtags: 5, hashtag: 10, intro: 300, timeline: 6, itemTitle: 20, itemText: 60 } as const;
export function defaultDolContent(today: Date): DolContent
export function nicknameOf(b: DolBasic): string               // 비우면 성 뺀 이름(3자 이상), 아니면 이름
export function guardianNames(b: DolBasic): string             // '이윤종 · 이다영' (이름 있는 보호자만)
export function addDays(date: string, days: number): string    // YYYY-MM-DD
export function seedTimeline(items: TimelineItem[], birthDate: string, eventDate: string): TimelineItem[]
export function validateDol(key: SectionKey, c: DolContent): string[]
export const DEFAULT_DOL_GREETING: string
export const dolTheme: ThemeDef
```

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/invitation/__tests__/dol.test.ts
import { createInvitation, sectionTabs, themeDef } from '../themes';
import { addDays, defaultDolContent, guardianNames, nicknameOf, seedTimeline, validateDol } from '../dol';
import type { DolContent } from '../model';

const today = new Date(2026, 9, 22);

describe('돌잔치', () => {
  it('기본값: 보호자 아빠·엄마 두 칸, 인사말 미리 채움, 성장 이야기는 비어 있음', () => {
    const c = defaultDolContent(today);
    expect(c.theme).toBe('dol');
    expect(c.basic.guardians.map((g) => g.relation)).toEqual(['아빠', '엄마']);
    expect(c.greeting.content).toContain('첫 번째 생일');
    expect(c.timeline.items).toEqual([]);
  });
  it('테마 등록: 입력 탭과 장 순서', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'dol', templateId: 'dol-1', today });
    expect(sectionTabs(inv)).toEqual(['basic', 'ceremony', 'greeting', 'profile', 'timeline', 'account', 'gallery', 'guestbook', 'ending']);
    expect(inv.order).toEqual(['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account']);
    expect(themeDef('dol').pageLabel('ceremony')).toBe('일시·장소');
  });
  it('부르는 이름·보호자 이름', () => {
    const b = { ...defaultDolContent(today).basic, childName: '이시안' };
    expect(nicknameOf(b)).toBe('시안');
    expect(nicknameOf({ ...b, nickname: '콩이' })).toBe('콩이');
    expect(nicknameOf({ ...b, childName: '하늘' })).toBe('하늘');
    const g = b.guardians.map((x, i) => ({ ...x, name: ['이윤종', ''][i] }));
    expect(guardianNames({ ...b, guardians: g })).toBe('이윤종');
  });
  it('성장 이야기 미리 채우기: 100일 = 태어난 날 + 99일, 첫 생일 = 행사일', () => {
    const items = seedTimeline([], '2025-04-26', '2026-04-26');
    expect(items.map((i) => [i.title, i.date])).toEqual([
      ['태어난 날', '2025-04-26'],
      ['100일', addDays('2025-04-26', 99)],
      ['첫 걸음마', ''],
      ['첫 생일', '2026-04-26'],
    ]);
    expect(addDays('2025-04-26', 99)).toBe('2025-08-03');
  });
  it('태어난 날을 바꿔도 사용자가 고친 항목은 그대로', () => {
    const first = seedTimeline([], '2025-04-26', '2026-04-26');
    const edited = first.map((i, n) => (n === 1 ? { ...i, text: '내가 쓴 글', edited: true } : i));
    const again = seedTimeline(edited, '2025-05-01', '2026-05-01');
    expect(again[0].date).toBe('2025-05-01');
    expect(again[1]).toEqual(edited[1]);
  });
  it('검사: 아이 이름·태어난 날·표지 사진 필수, 태어난 날은 행사일보다 앞', () => {
    const c: DolContent = defaultDolContent(today);
    expect(validateDol('basic', c)).toEqual(expect.arrayContaining(['childName', 'birthDate', 'photo']));
    const ok = { ...c, basic: { ...c.basic, childName: '이시안', birthDate: '2025-04-26', photo: 'p.jpg', guardians: c.basic.guardians.map((g) => ({ ...g, name: '보호자' })) } };
    expect(validateDol('basic', ok)).toEqual([]);
    const late = { ...ok, basic: { ...ok.basic, birthDate: '2099-01-01' } };
    expect(validateDol('basic', late)).toContain('birthDate');
  });
  it('계좌: 보호자를 지우면 그 계좌는 검사에서 빠지고, 한 명 이상은 채워야 한다', () => {
    const c = defaultDolContent(today);
    const [dad, mom] = c.basic.guardians;
    const withAcc = { ...c, account: { ...c.account, accounts: { [mom.id]: { bank: '국민', number: '123' } } } };
    expect(validateDol('account', withAcc)).toEqual([]);
    const momGone = { ...withAcc, basic: { ...withAcc.basic, guardians: [dad] } };
    expect(validateDol('account', momGone)).toEqual(['accounts']);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/dol.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현** — `dol.ts`

```ts
/** 돌잔치 초대장 — 기본값·검사·성장 이야기 미리 채우기·테마 정의 (설계 3장) */
import { newItemId } from './editor/listOps';
import {
  BankAccount, CeremonyInfo, defaultContent, DolBasic, DolContent, Guardian, LIMITS, PageKey,
  parseDate, SectionKey, TimelineItem, toDateString, validateSection,
} from './model';
import { registerTheme, ThemeDef } from './themes';

export const DOL_LIMITS = { name: 10, relation: 10, guardians: 4, hashtags: 5, hashtag: 10, intro: 300, timeline: 6, itemTitle: 20, itemText: 60 } as const;

export const DEFAULT_DOL_GREETING =
  '사랑스러운 우리 아이가\n세상에 태어난 지 벌써 일 년이 되었습니다.\n\n첫 걸음마, 첫 미소, 첫 옹알이…\n소중한 순간들을 함께해 주신 분들께\n감사의 마음을 전하고자 합니다.\n\n아이의 첫 번째 생일을\n함께 축하해 주세요.';
export const DEFAULT_DOL_ACCOUNT_MESSAGE =
  '참석이 어려우신 분들을 위해\n계좌번호를 안내해 드립니다.\n너그러운 마음으로 양해 부탁드립니다.';
export const DEFAULT_DOL_ENDING = '와 주셔서 감사합니다.\n건강하고 바르게 키우겠습니다.';

const guardian = (relation: string): Guardian => ({ id: newItemId(), relation, name: '' });

export function defaultDolContent(today: Date): DolContent {
  const w = defaultContent(today);
  return {
    theme: 'dol',
    basic: { childName: '', nickname: '', birthDate: '', photo: null, guardians: [guardian('아빠'), guardian('엄마')] },
    ceremony: { ...w.ceremony, time: '12:00' },
    greeting: { content: DEFAULT_DOL_GREETING, photo: null, appendNames: true },
    profile: { photo: null, intro: '', hashtags: [] },
    timeline: { items: [] },
    account: { message: DEFAULT_DOL_ACCOUNT_MESSAGE, accounts: {} },
    gallery: w.gallery,
    guestbook: w.guestbook,
    ending: { ...w.ending, content: DEFAULT_DOL_ENDING },
    bgm: w.bgm,
  };
}

/** 부르는 이름: 직접 넣었으면 그것, 아니면 성 뺀 이름(3자 이상일 때) */
export function nicknameOf(b: DolBasic): string {
  if (b.nickname.trim()) return b.nickname.trim();
  const n = b.childName.trim();
  return n.length >= 3 ? n.slice(1) : n;
}

export const guardianNames = (b: DolBasic) =>
  b.guardians.map((g) => g.name.trim()).filter(Boolean).join(' · ');

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  return toDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

const SEEDS: { key: string; title: string; text: string; date: (birth: string, event: string) => string }[] = [
  { key: 'born', title: '태어난 날', text: '작은 울음으로 모든 하루를 바꾼 날', date: (b) => b },
  { key: '100', title: '100일', text: '먹고 자고 웃다 보니 어느새 100일', date: (b) => addDays(b, 99) },
  { key: 'walk', title: '첫 걸음마', text: '하루하루가 처음이었어요', date: () => '' },
  { key: 'first', title: '첫 생일', text: '드디어 저의 첫 생일이에요', date: (b, e) => e || addDays(b, 365) },
];

/**
 * 성장 이야기 미리 채우기. 비어 있으면 4개를 만들고, 이미 있으면 사용자가 고치지 않은(edited=false)
 * 미리 채운 항목의 날짜만 새 태어난 날 기준으로 다시 맞춘다.
 */
export function seedTimeline(items: TimelineItem[], birthDate: string, eventDate: string): TimelineItem[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return items;
  if (!items.length) {
    return SEEDS.map((s) => ({ id: `seed-${s.key}`, photo: null, date: s.date(birthDate, eventDate), title: s.title, text: s.text, edited: false }));
  }
  return items.map((it) => {
    const seed = SEEDS.find((s) => it.id === `seed-${s.key}`);
    return seed && !it.edited ? { ...it, date: seed.date(birthDate, eventDate) } : it;
  });
}

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const fullAccount = (a?: BankAccount) => !!a && filled(a.bank) && filled(a.number);
const halfAccount = (a?: BankAccount) => !!a && filled(a.bank) !== filled(a.number);

export function validateDol(key: SectionKey, c: DolContent): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);
  switch (key) {
    case 'basic': {
      const b = c.basic;
      check(filled(b.childName) && within(b.childName, DOL_LIMITS.name), 'childName');
      check(within(b.nickname, DOL_LIMITS.name), 'nickname');
      check(isDate(b.birthDate) && (!isDate(c.ceremony.date) || b.birthDate <= c.ceremony.date), 'birthDate');
      check(!!b.photo, 'photo');
      check(b.guardians.length >= 1 && b.guardians.length <= DOL_LIMITS.guardians, 'guardians');
      check(
        b.guardians.every((g) => filled(g.relation) && filled(g.name) && within(g.relation, DOL_LIMITS.relation) && within(g.name, DOL_LIMITS.name)),
        'guardians',
      );
      break;
    }
    case 'profile': {
      const p = c.profile;
      check(p.intro.length <= DOL_LIMITS.intro, 'intro');
      check(p.hashtags.length <= DOL_LIMITS.hashtags && p.hashtags.every((h) => within(h, DOL_LIMITS.hashtag)), 'hashtags');
      break;
    }
    case 'timeline': {
      const items = c.timeline.items;
      check(items.length >= 1 && items.length <= DOL_LIMITS.timeline, 'items');
      check(items.every((i) => filled(i.title) && within(i.title, DOL_LIMITS.itemTitle) && within(i.text, DOL_LIMITS.itemText)), 'items');
      break;
    }
    case 'account': {
      // 지금 있는 보호자의 계좌만 본다 (지운 보호자의 계좌는 무시)
      const ids = c.basic.guardians.map((g) => g.id);
      const accounts = ids.map((id) => c.account.accounts[id]);
      check(c.account.message.length <= LIMITS.accountMessage, 'message');
      check(accounts.some(fullAccount) && !accounts.some(halfAccount), 'accounts');
      break;
    }
    default:
      // 일시·장소·인사말·갤러리·방명록·엔딩·BGM 은 결혼식과 같은 규칙
      return validateSection(key, { ...defaultContent(), ceremony: c.ceremony, greeting: c.greeting, gallery: c.gallery, guestbook: c.guestbook, ending: c.ending, bgm: c.bgm });
  }
  return errors;
}

const DOL_SECTION_LABEL: Partial<Record<SectionKey, string>> = { ceremony: '일시·장소', account: '마음 전하는 곳' };
const DOL_PAGE_LABEL: Partial<Record<PageKey, string>> = { ceremony: '일시·장소', account: '마음 전하는 곳' };

export const dolTheme: ThemeDef = {
  id: 'dol',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '아이와 보호자 정보, 표지 사진을 입력합니다.' },
    { key: 'ceremony', title: '일시·장소', body: '돌잔치 날짜와 장소를 입력합니다.' },
    { key: 'greeting', title: '인사말', body: '하객분께 드릴 인사말을 입력합니다.' },
  ],
  optional: [
    { key: 'profile', title: '아이 프로필', body: '아이 사진과 소개, 해시태그를 보여줍니다.' },
    { key: 'timeline', title: '성장 이야기', body: '태어난 날부터 첫 생일까지의 이야기를 보여줍니다.' },
    { key: 'account', title: '마음 전하는 곳', body: '보호자 계좌를 안내합니다.' },
    { key: 'gallery', title: '갤러리', body: '아이 사진 갤러리를 제공합니다.' },
    { key: 'guestbook', title: '방명록', body: '방명록 기능을 제공합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: { profile: true, timeline: true, account: true, gallery: true, guestbook: true, ending: true, bgm: false },
  defaultOrder: ['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account'],
  createContent: defaultDolContent,
  validate: (key, c) => validateDol(key, c as DolContent),
  sectionLabel: (k) => DOL_SECTION_LABEL[k] ?? SECTION_LABEL_FALLBACK[k],
  pageLabel: (p) => DOL_PAGE_LABEL[p] ?? PAGE_LABEL_FALLBACK[p],
};

registerTheme(dolTheme);
```
  - `SECTION_LABEL_FALLBACK`·`PAGE_LABEL_FALLBACK` 는 `model.ts` 의 `SECTION_LABEL`·`PAGE_LABEL` 을 import 한 이름(이 파일에서 `import { SECTION_LABEL as SECTION_LABEL_FALLBACK, PAGE_LABEL as PAGE_LABEL_FALLBACK } from './model'`).
  - 등록이 앱 시작 때 일어나게 `themes.ts` 맨 아래에 두지 말고, **`src/features/invitation/registerThemes.ts`** 를 만들어 `import './dol';` 한 줄을 두고 `src/app/_layout.tsx` 와 `jest.setup.ts` 에서 `import '../features/invitation/registerThemes'`(경로 맞춤) 한다. (`themes.ts` ↔ `dol.ts` 순환 import 방지)
  - `model.ts` `validateSection` 의 `profile`·`timeline` 케이스는 지운다(돌잔치 정의가 처리).

- [ ] **Step 4: 확인** — Run: `npx jest src/features/invitation/__tests__/dol.test.ts && npx tsc --noEmit` / Expected: PASS(7), 오류 0

- [ ] **Step 5: 커밋**
```bash
git add src jest.setup.ts && git commit -m "feat: 돌잔치 콘텐츠·검사·성장 이야기 미리 채우기·테마 등록"
```

---

### Task 5: 돌잔치 템플릿 10종·색·둥근 서체

**Files:**
- Modify: `src/data/templates.ts`, `src/theme/index.ts`, `src/features/invitation/view/look.tsx`, `src/features/invitation/editor/PalettePicker.tsx`, `src/app/create/editor/compose.tsx`
- Test: `src/data/__tests__/templates.test.ts`

**Interfaces:**
- Produces:
  - `TemplateFont = 'sans' | 'serif' | 'round'`
  - `TemplateStyle` 에 `frame?: 'arch' | 'circle' | 'oval' | 'rounded' | 'cloud'`, `sparkle?: 'star' | 'heart' | 'dot' | 'none'` (돌잔치만 씀)
  - `palettesFor(themeId: string): Palette[]` — 돌잔치면 돌잔치 10색, 그 밖은 지금의 `PALETTES`
  - `styleFor`·`paletteOfTemplate` 는 `palettesFor(themeId)` 를 쓴다
  - `fonts.round`, `fonts.roundBold` (고운돋움 — 굵기가 하나라 둘 다 같은 파일)

- [ ] **Step 1: 서체 설치** — Run: `npx expo install @expo-google-fonts/gowun-dodum` / Expected: package.json 에 추가. (`node_modules/@expo-google-fonts/gowun-dodum/400Regular/GowunDodum_400Regular.ttf` 확인)

- [ ] **Step 2: 실패하는 테스트** (`templates.test.ts` 에 추가)

```ts
describe('돌잔치 템플릿', () => {
  it('10종 모두 둥근 서체·사진 틀·반짝이를 가진다', () => {
    const t = getTemplates('dol');
    expect(t).toHaveLength(10);
    t.forEach((x) => {
      expect(x.style.font).toBe('round');
      expect(['arch', 'circle', 'oval', 'rounded', 'cloud']).toContain(x.style.frame);
      expect(['star', 'heart', 'dot', 'none']).toContain(x.style.sparkle);
    });
  });
  it('색 조합은 테마별: 돌잔치는 돌잔치 10색', () => {
    expect(palettesFor('dol').map((p) => p.id)).toEqual(['peach', 'mint', 'lemon', 'skyblue', 'lilac', 'coral', 'cream', 'leaf', 'rose', 'cloud']);
    expect(palettesFor('wedding')).toBe(PALETTES);
    expect(paletteOfTemplate('dol', 'dol-2')).toBe('mint');
    expect(styleFor('dol', 'dol-1', 'mint').bg).toBe(palettesFor('dol')[1].bg);
  });
});
```
  (import 에 `palettesFor` 추가)

- [ ] **Step 3: 실패 확인** — Run: `npx jest src/data` / Expected: FAIL

- [ ] **Step 4: 구현**
  - `theme/index.ts`: `fonts` 에 `round: 'GowunDodum-Regular', roundBold: 'GowunDodum-Regular'`, `fontSources` 에 `[fonts.round]: require('@expo-google-fonts/gowun-dodum/400Regular/GowunDodum_400Regular.ttf')` (주석: OFL-1.1).
  - `templates.ts`:

```ts
export type TemplateFont = 'sans' | 'serif' | 'round';
// TemplateStyle 에 추가
  /** 돌잔치 표지 사진 틀 */
  frame?: 'arch' | 'circle' | 'oval' | 'rounded' | 'cloud';
  /** 돌잔치 표지 반짝이 */
  sparkle?: 'star' | 'heart' | 'dot' | 'none';

/** 돌잔치 전용 10종 — 파스텔·둥근 서체 (설계 3장) */
const DOL_STYLES: { name: string; style: TemplateStyle }[] = [
  { name: '피치', style: { bg: '#FFF4EE', fg: '#4A2F2A', sub: '#9A7468', accent: '#F08A6C', font: 'round', cover: 'date', frame: 'arch', sparkle: 'star' } },
  { name: '민트', style: { bg: '#EEF8F3', fg: '#23443A', sub: '#6E8F84', accent: '#4FB08C', font: 'round', cover: 'date', frame: 'circle', sparkle: 'dot' } },
  { name: '레몬', style: { bg: '#FFFBE6', fg: '#4A4220', sub: '#8F8457', accent: '#E8B931', font: 'round', cover: 'date', frame: 'rounded', sparkle: 'star' } },
  { name: '하늘', style: { bg: '#EEF6FD', fg: '#213A52', sub: '#6D869C', accent: '#5B9BD9', font: 'round', cover: 'date', frame: 'cloud', sparkle: 'dot' } },
  { name: '라일락', style: { bg: '#F5F0FB', fg: '#3A2E4D', sub: '#857A98', accent: '#A487D4', font: 'round', cover: 'date', frame: 'oval', sparkle: 'heart' } },
  { name: '코랄', style: { bg: '#FFF1F0', fg: '#4D2A28', sub: '#9C716E', accent: '#EE6F67', font: 'round', cover: 'date', frame: 'arch', sparkle: 'heart' } },
  { name: '크림', style: { bg: '#FBF6EC', fg: '#43392B', sub: '#8E8270', accent: '#C8A06A', font: 'round', cover: 'date', frame: 'rounded', sparkle: 'none' } },
  { name: '새싹', style: { bg: '#F2F8EA', fg: '#2F4021', sub: '#7A8B6B', accent: '#86B556', font: 'round', cover: 'date', frame: 'circle', sparkle: 'star' } },
  { name: '로즈', style: { bg: '#FDF0F4', fg: '#4B2634', sub: '#977383', accent: '#E07A9C', font: 'round', cover: 'date', frame: 'oval', sparkle: 'heart' } },
  { name: '구름', style: { bg: '#F4F6FA', fg: '#2C3446', sub: '#7B8396', accent: '#8C9CC4', font: 'round', cover: 'date', frame: 'cloud', sparkle: 'star' } },
];
const DOL_PALETTE_IDS = ['peach', 'mint', 'lemon', 'skyblue', 'lilac', 'coral', 'cream', 'leaf', 'rose', 'cloud'];
export const DOL_PALETTES: Palette[] = DOL_STYLES.map(({ name, style }, i) => ({
  id: DOL_PALETTE_IDS[i], name, bg: style.bg, fg: style.fg, sub: style.sub, accent: style.accent,
}));
export const palettesFor = (themeId: string): Palette[] => (themeId === 'dol' ? DOL_PALETTES : PALETTES);
```
  - `TEMPLATES` 생성에서 `themeId === 'dol'` 이면 `DOL_STYLES` 를 쓴다.
  - `styleFor`·`paletteOfTemplate` 안의 `PALETTES` → `palettesFor(themeId)`.
  - `templateFontFamily` 에 `round: [fonts.round, fonts.roundBold]`.
  - `PalettePicker.tsx` `PaletteModal` 에 `themeId: string` prop 을 받고 `PALETTES` → `palettesFor(themeId)`. `compose.tsx` 에서 `themeId={draft.themeId}` 전달.
  - i18n: 피치·민트·레몬·하늘·라일락·코랄·크림·새싹·로즈·구름 (없는 것만 추가).

- [ ] **Step 5: 확인** — Run: `npx jest && npx tsc --noEmit` / Expected: 전체 통과, 오류 0

- [ ] **Step 6: 커밋**
```bash
git add package.json package-lock.json src && git commit -m "feat: 돌잔치 템플릿 10종·색 조합·고운돋움 서체"
```

---

### Task 6: 캔버스 — 표지 사진 요소·돌잔치 정보 글자·돌잔치 표지 배치

**Files:**
- Modify: `src/features/canvas/types.ts`, `src/features/canvas/model.ts`, `src/features/canvas/preset.ts`, `src/features/canvas/render/ElementView.tsx`, `src/features/canvas/editor/Pickers.tsx`(BindPicker), `src/features/canvas/editor/PropertyBar.tsx`, `src/features/canvas/editor/CanvasEditor.tsx`, `src/features/invitation/view/CoverSlide.tsx`, `src/app/create/editor/compose.tsx`, `src/features/invitation/editorStore.ts`
- Test: `src/features/canvas/__tests__/dolCover.test.ts`

**Interfaces:**
- Produces:
  - `BindKey` 에 `'childName' | 'nickname' | 'guardians' | 'firstBirthday'` 추가
  - `PhotoElement = ElementBase & { kind: 'photo'; bind: 'coverPhoto'; aspect: number; frame: PhotoFrame }`, `PhotoFrame = 'arch' | 'circle' | 'oval' | 'rounded' | 'cloud'`
  - `bindsFor(themeId: string): BindKey[]` (결혼식: 지금 8개 / 돌잔치: childName·nickname·guardians·firstBirthday·date·weekday·datetime·time·venue)
  - `resolveBind(bind, c)` 가 `isDol(c)` 면 돌잔치 값
  - `coverPreset(style, themeId = 'wedding')` — 돌잔치면 돌잔치 배치
  - `resolvePhoto(c): string | null` — 돌잔치 표지 사진

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/canvas/__tests__/dolCover.test.ts
import { getTemplates } from '../../../data/templates';
import { defaultDolContent } from '../../invitation/dol';
import '../../invitation/registerThemes';
import { bindsFor, resolveBind } from '../model';
import { coverPreset } from '../preset';

const c = { ...defaultDolContent(new Date(2026, 9, 22)) };
c.basic = { ...c.basic, childName: '이시안', guardians: c.basic.guardians.map((g, i) => ({ ...g, name: ['이윤종', '이다영'][i] })) };
c.ceremony = { ...c.ceremony, date: '2027-04-22', venue: '비비드 파티룸' };

describe('돌잔치 표지', () => {
  it('배치: 사진 틀(템플릿 틀) + 아이 이름 + 일시·장소 + 보호자', () => {
    const style = getTemplates('dol')[0].style;
    const doc = coverPreset(style, 'dol');
    const photo = doc.elements.find((e) => e.kind === 'photo');
    expect(photo && photo.kind === 'photo' && photo.frame).toBe(style.frame);
    const binds = doc.elements.flatMap((e) => (e.kind === 'bound' ? [e.bind] : []));
    expect(binds).toEqual(expect.arrayContaining(['childName', 'datetime', 'venue', 'guardians']));
  });
  it('정보 글자 값', () => {
    expect(resolveBind('childName', c).text).toBe('이시안');
    expect(resolveBind('nickname', c).text).toBe('시안');
    expect(resolveBind('guardians', c).text).toBe('아빠 이윤종 · 엄마 이다영');
    expect(resolveBind('firstBirthday', c).text).toBe('시안이의 첫 생일');
    expect(resolveBind('venue', c).text).toBe('비비드 파티룸');
  });
  it('이름이 비면 안내 글자(placeholder)', () => {
    const empty = defaultDolContent(new Date(2026, 9, 22));
    expect(resolveBind('childName', empty)).toEqual({ text: '아이 이름', placeholder: true });
  });
  it('정보 글자 목록은 테마별', () => {
    expect(bindsFor('dol')).toContain('childName');
    expect(bindsFor('dol')).not.toContain('coupleNames');
    expect(bindsFor('wedding')).toContain('coupleNames');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/canvas/__tests__/dolCover.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현**
  - `types.ts`: `BindKey` 확장, `PhotoFrame`, `PhotoElement` 추가, `CanvasElement` 합집합에 `PhotoElement`.
  - `model.ts`:

```ts
export const BIND_LABEL: Record<BindKey, string> = { /* 기존 8개 */
  childName: '아이 이름', nickname: '부르는 이름', guardians: '보호자', firstBirthday: '○○이의 첫 생일',
  /* … */ };
const WEDDING_BINDS: BindKey[] = ['groomName', 'brideName', 'coupleNames', 'date', 'weekday', 'datetime', 'time', 'venue'];
const DOL_BINDS: BindKey[] = ['childName', 'nickname', 'guardians', 'firstBirthday', 'date', 'weekday', 'datetime', 'time', 'venue'];
export const bindsFor = (themeId: string): BindKey[] => (themeId === 'dol' ? DOL_BINDS : WEDDING_BINDS);

export function resolveBind(bind: BindKey, c: InvitationContent): { text: string; placeholder: boolean } {
  const d = parseDate(c.ceremony.date);
  // 날짜·시간·장소는 두 테마 공통 (ceremony 필드)
  switch (bind) {
    case 'date': return { text: `${d.getFullYear()} / ${d.getMonth() + 1} / ${d.getDate()}`, placeholder: false };
    case 'weekday': return { text: WEEKDAYS_EN[d.getDay()], placeholder: false };
    case 'datetime': return { text: formatDateTimeLine(d, c.ceremony.time), placeholder: false };
    case 'time': return { text: formatKoreanTime(c.ceremony.time), placeholder: false };
    case 'venue': {
      const venue = c.ceremony.venue.trim();
      return venue ? { text: venue, placeholder: false } : { text: isDol(c) ? '장소' : '예식장', placeholder: true };
    }
  }
  if (isDol(c)) {
    const b = c.basic;
    const name = b.childName.trim();
    switch (bind) {
      case 'childName': return name ? { text: name, placeholder: false } : { text: '아이 이름', placeholder: true };
      case 'nickname': return name ? { text: nicknameOf(b), placeholder: false } : { text: '아이', placeholder: true };
      case 'guardians': {
        const line = b.guardians.filter((g) => g.name.trim()).map((g) => `${g.relation} ${g.name.trim()}`).join(' · ');
        return line ? { text: line, placeholder: false } : { text: '보호자', placeholder: true };
      }
      case 'firstBirthday': return { text: `${name ? nicknameOf(b) : '아이'}이의 첫 생일`, placeholder: !name };
      default: return { text: '', placeholder: true };
    }
  }
  // 결혼식 (기존 그대로)
  const w = c;
  const groom = w.basic.groom.name.trim();
  const bride = w.basic.bride.name.trim();
  switch (bind) {
    case 'groomName': return groom ? { text: groom, placeholder: false } : { text: '신랑', placeholder: true };
    case 'brideName': return bride ? { text: bride, placeholder: false } : { text: '신부', placeholder: true };
    case 'coupleNames': return { text: `${groom || '신랑'} ♥ ${bride || '신부'}`, placeholder: !groom || !bride };
    default: return { text: '', placeholder: true };
  }
}

/** 돌잔치 표지 사진 (없으면 null — 빈 틀로 그린다) */
export const resolvePhoto = (c: InvitationContent): string | null => (isDol(c) ? c.basic.photo : null);
```
  (`'○○이의 첫 생일'` 의 "이" 는 받침과 무관하게 붙인다 — 단순화 Ruling: 받침 없는 이름(예: 하나)도 "하나이의"가 됨 → **수정: 받침 판단 함수** `withSubjectSuffix(name)`: 마지막 글자 `(code-0xAC00) % 28 === 0` 이면 `${name}의`, 아니면 `${name}이의`. 테스트 `'시안이의 첫 생일'`, 그리고 `nicknameOf` 가 '하나' 일 때 `'하나의 첫 생일'` 을 Step 1 테스트에 추가.)
  - `preset.ts` — `coverPreset(style, themeId = 'wedding')`, 돌잔치 분기:

```ts
if (themeId === 'dol') {
  const frame = style.frame ?? 'arch';
  const sparkle = style.sparkle ?? 'star';
  const mark = sparkle === 'heart' ? '♥' : sparkle === 'dot' ? '●' : sparkle === 'star' ? '✦' : '';
  const els: CanvasElement[] = [
    text('preset-happy', 'H a p p y', 0.13, 12, style.accent),
    text('preset-first', 'First BIRTHDAY', 0.18, 26, style.accent, true),
    { id: 'preset-photo', kind: 'photo', bind: 'coverPhoto', x: 0.5, y: 0.43, w: 0.66, rotation: 0, aspect: frame === 'circle' ? 1 : 1.25, frame },
    bound('preset-name', 'childName', 0.71, 22, style.fg, true),
    bound('preset-datetime', 'datetime', 0.77, 13, style.sub),
    bound('preset-venue', 'venue', 0.81, 13, style.sub),
    bound('preset-guardians', 'guardians', 0.87, 13, style.fg),
  ];
  if (mark) {
    els.push(text('preset-mark-l', mark, 0.24, 14, style.accent), text('preset-mark-r', mark, 0.24, 14, style.accent));
    els[els.length - 2] = { ...els[els.length - 2], x: 0.18 } as CanvasElement;
    els[els.length - 1] = { ...els[els.length - 1], x: 0.82 } as CanvasElement;
  }
  return { background: { kind: 'template' }, elements: els };
}
```
  (`text`·`bound` 의 `w: 0.9` 는 그대로; 반짝이는 폭 0.12 로 별도 `{...text(...), w: 0.12, x}`)
  - `canvasForEditing(design, style, themeId)` 도 `themeId` 를 받아 `coverPreset(style, themeId)`.
  - `ElementView.tsx` — `ElementContent` 에 `photo` 분기: `resolvePhoto(content)` 가 있으면 `expo-image` `Image` 를 틀 모양으로, 없으면 연한 회색 틀 + `Ionicons 'image-outline'` + `IText` 대신 `Text` "표지 사진"(번역은 `translate(…, locale)`).

```ts
const FRAME_RADIUS = (frame: PhotoFrame, w: number, h: number) => {
  switch (frame) {
    case 'arch': return { borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 };
    case 'circle':
    case 'oval': return { borderRadius: Math.max(w, h) / 2 };
    case 'cloud': return { borderRadius: Math.min(w, h) * 0.3 };
    default: return { borderRadius: Math.min(w, h) * 0.08 };
  }
};
```
  `elementHeight` 는 `photo` 도 `w * slideW * aspect`.
  - `CanvasEditor.tsx` — `photo` 요소는 이미지처럼 끌기·크기·회전. 속성 바 `PropertyBar` 에 `photo` 일 때 틀 5종 버튼(아치·원형·타원·둥근·구름) → `onChange({ frame })`. 정보 글자 고르기(`BindPicker`)는 `binds={bindsFor(themeId)}` prop 으로 목록을 받는다 — `CanvasEditor` 에 `themeId` prop 추가, `compose.tsx` 에서 `themeId={draft.themeId}`.
  - `CoverSlide.tsx`: `coverPreset(style, invitation.themeId)`. `editorStore.startCanvas`·`compose.openCanvas` 도 `themeId` 전달.
  - i18n: 아이 이름·부르는 이름·보호자·'○○이의 첫 생일'·장소·표지 사진·아치·원형·타원·둥근·구름(있는 키는 생략)·`'{0}이의 첫 생일'`·`'{0}의 첫 생일'` 은 사용자 이름이 끼어 번역되지 않으므로 사전에 넣되 `bound.placeholder` 만 번역되는 현 구조상 문제 없음.

- [ ] **Step 4: 확인** — Run: `npx jest src/features/canvas && npx tsc --noEmit` / Expected: PASS, 오류 0

- [ ] **Step 5: 커밋**
```bash
git add src && git commit -m "feat: 돌잔치 표지 — 사진 틀 요소·정보 글자·표지 배치"
```

---

### Task 7: 돌잔치 입력 폼과 테마별 입력 시트

**Files:**
- Create: `src/features/invitation/editor/DolForms.tsx`
- Modify: `src/features/invitation/editor/SectionSheet.tsx`, `src/features/invitation/editorStore.ts`
- Test: `src/features/invitation/__tests__/editorStore.test.ts` (돌잔치 케이스 추가)

**Interfaces:**
- Consumes: Task 3 `ListEditor`·`listOps`, Task 4 `DOL_LIMITS`·`seedTimeline`
- Produces: `DolBasicForm`, `DolProfileForm`, `DolTimelineForm`, `DolAccountForm` (모두 props 없음, `useEditor` 사용). 스토어: `patch('basic', { birthDate })` 때 돌잔치면 `timeline.items = seedTimeline(items, birthDate, ceremony.date)`, `patch('ceremony', { date })` 때 `seedTimeline(items, basic.birthDate, date)`.

- [ ] **Step 1: 실패하는 테스트** (editorStore.test.ts 에 추가)

```ts
it('돌잔치: 태어난 날을 넣으면 성장 이야기 4개가 채워지고, 행사일을 바꾸면 첫 생일 날짜가 따라간다', () => {
  useEditor.getState().start({ ownerId: 'u', themeId: 'dol', templateId: 'dol-1', today: new Date(2026, 9, 22) });
  useEditor.getState().patch('basic', { birthDate: '2025-04-26' });
  const items = () => (useEditor.getState().draft!.content as DolContent).timeline.items;
  expect(items().map((i) => i.title)).toEqual(['태어난 날', '100일', '첫 걸음마', '첫 생일']);
  useEditor.getState().patch('ceremony', { date: '2026-05-02' });
  expect(items()[3].date).toBe('2026-05-02');
});
```
  (`DolContent` import, 파일 위에 `import '../registerThemes';`)

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/editorStore.test.ts` / Expected: FAIL

- [ ] **Step 3: 스토어 구현** — `editorStore.patch` 에서 콘텐츠를 만든 뒤:

```ts
let content = { ...s.draft.content, [key]: { ...(s.draft.content as Record<string, object>)[key], ...values } } as InvitationContent;
// 돌잔치: 태어난 날·행사일이 바뀌면 성장 이야기 미리 채우기 (고친 항목은 그대로)
if (isDol(content) && (key === 'basic' || key === 'ceremony')) {
  content = { ...content, timeline: { items: seedTimeline(content.timeline.items, content.basic.birthDate, content.ceremony.date) } };
}
```

- [ ] **Step 4: 폼 구현** — `DolForms.tsx` (기존 `TextForms.tsx` 패턴: `TextField`, `TextArea`, `FormLabel`, `Hint`, `AccountFields`, `DatePickerModal`, `pickImages`)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { DOL_LIMITS } from '../dol';
import { useEditor } from '../editorStore';
import { pickImages } from '../media';
import { DolContent, LIMITS, TimelineItem } from '../model';
import { AccountFields, FormLabel, Hint } from './fields';
import { ListEditor } from './ListEditor';
import { addItem, newItemId, updateItem } from './listOps';
import { DatePickerModal } from './Pickers';

const useDol = () => useEditor((s) => s.draft!.content as DolContent);
const usePatch = () => useEditor((s) => s.patch);

/** 사진 한 장 칸 (있으면 미리보기 + ×) */
function PhotoOne({ uri, onChange, required, label }: { uri: string | null; onChange: (u: string | null) => void; required?: boolean; label: string }) {
  const pick = async () => {
    const [p] = await pickImages(1);
    if (p) onChange(p);
  };
  return (
    <View style={styles.group}>
      <FormLabel required={required}>{label}</FormLabel>
      {uri ? (
        <View style={styles.photo}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Pressable onPress={() => onChange(null)} style={styles.remove} accessibilityLabel="사진 삭제">
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pick} style={[styles.photo, styles.add, required && styles.addRequired]} accessibilityRole="button" accessibilityLabel="사진 추가">
          <Ionicons name="add" size={24} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

/** 날짜 칸 — 누르면 달력 */
function DateField({ label, value, onChange, required }: { label: string; value: string; onChange: (d: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <FormLabel required={required}>{label}</FormLabel>
      <Pressable onPress={() => setOpen(true)} style={[styles.dateBox, required && !value && styles.addRequired]} accessibilityRole="button" accessibilityLabel={label}>
        <Txt color={value ? colors.text : colors.placeholder}>{value || '날짜 선택'}</Txt>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>
      <DatePickerModal visible={open} value={value || '2025-01-01'} onClose={() => setOpen(false)} onSelect={(d) => { onChange(d); setOpen(false); }} />
    </View>
  );
}

/** 기본 정보: 아이(이름·부르는 이름·태어난 날·표지 사진) + 보호자 1~4명 */
export function DolBasicForm() {
  const b = useDol().basic;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextField label="아이 이름" required value={b.childName} onChangeText={(childName) => patch('basic', { childName })} maxLength={DOL_LIMITS.name} invalid={!b.childName.trim()} placeholder="이시안" />
      <TextField label="부르는 이름" value={b.nickname} onChangeText={(nickname) => patch('basic', { nickname })} maxLength={DOL_LIMITS.name} placeholder="비우면 '시안'처럼 이름만" />
      <DateField label="태어난 날" required value={b.birthDate} onChange={(birthDate) => patch('basic', { birthDate })} />
      <PhotoOne label="표지 사진" required uri={b.photo} onChange={(photo) => patch('basic', { photo })} />
      <Txt variant="title" style={styles.side}>보호자</Txt>
      <ListEditor
        items={b.guardians}
        max={DOL_LIMITS.guardians}
        addLabel="보호자 추가"
        onAdd={() => patch('basic', { guardians: addItem(b.guardians, { id: newItemId(), relation: '', name: '' }, DOL_LIMITS.guardians) })}
        onChange={(guardians) => patch('basic', { guardians })}
        renderItem={(g) => (
          <View style={styles.pair}>
            <View style={styles.narrow}>
              <TextField placeholder="관계" value={g.relation} onChangeText={(relation) => patch('basic', { guardians: updateItem(b.guardians, g.id, { relation }) })} maxLength={DOL_LIMITS.relation} invalid={!g.relation.trim()} />
            </View>
            <View style={styles.wide}>
              <TextField placeholder="이름" value={g.name} onChangeText={(name) => patch('basic', { guardians: updateItem(b.guardians, g.id, { name }) })} maxLength={DOL_LIMITS.name} invalid={!g.name.trim()} />
            </View>
          </View>
        )}
      />
      <Hint>관계는 아빠·엄마·할머니처럼 자유롭게 적어 주세요.</Hint>
    </View>
  );
}

/** 아이 프로필: 사진·소개·해시태그 */
export function DolProfileForm() {
  const p = useDol().profile;
  const patch = usePatch();
  const [tag, setTag] = useState('');
  const addTag = () => {
    const t = tag.replace(/^#/, '').trim().slice(0, DOL_LIMITS.hashtag);
    if (t && p.hashtags.length < DOL_LIMITS.hashtags && !p.hashtags.includes(t)) patch('profile', { hashtags: [...p.hashtags, t] });
    setTag('');
  };
  return (
    <View style={styles.form}>
      <PhotoOne label="사진" uri={p.photo} onChange={(photo) => patch('profile', { photo })} />
      <TextArea label="소개" value={p.intro} onChangeText={(intro) => patch('profile', { intro })} maxLength={DOL_LIMITS.intro} placeholder={'울다 웃다 자다\n그렇게 1년, 이제 돌이에요'} minHeight={110} />
      <View style={styles.group}>
        <FormLabel>해시태그</FormLabel>
        <View style={styles.chips}>
          {p.hashtags.map((h) => (
            <Pressable key={h} onPress={() => patch('profile', { hashtags: p.hashtags.filter((x) => x !== h) })} style={styles.chip} accessibilityRole="button" accessibilityLabel={`#${h} 지우기`}>
              <Txt variant="caption" raw>{`#${h}`}</Txt>
              <Ionicons name="close" size={12} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        {p.hashtags.length < DOL_LIMITS.hashtags && (
          <TextField placeholder="웃음요정" value={tag} onChangeText={setTag} onSubmitEditing={addTag} onBlur={addTag} maxLength={DOL_LIMITS.hashtag + 1} returnKeyType="done" />
        )}
        <Hint>최대 5개 · 입력 후 완료를 누르면 추가돼요.</Hint>
      </View>
    </View>
  );
}

/** 성장 이야기: 항목(사진·날짜·제목·한 줄) 최대 6개 */
export function DolTimelineForm() {
  const c = useDol();
  const items = c.timeline.items;
  const patch = usePatch();
  const set = (next: TimelineItem[]) => patch('timeline', { items: next });
  const edit = (id: string, change: Partial<TimelineItem>) => set(updateItem(items, id, { ...change, edited: true }));
  return (
    <View style={styles.form}>
      {!items.length && <Hint>기본 정보에 태어난 날을 넣으면 예시 4개가 채워져요.</Hint>}
      <ListEditor
        items={items}
        max={DOL_LIMITS.timeline}
        addLabel="이야기 추가"
        onAdd={() => set(addItem(items, { id: newItemId(), photo: null, date: '', title: '', text: '', edited: true }, DOL_LIMITS.timeline))}
        onChange={set}
        renderItem={(it) => (
          <View style={styles.form}>
            <DateField label="날짜" value={it.date} onChange={(date) => edit(it.id, { date })} />
            <TextField label="제목" required value={it.title} onChangeText={(title) => edit(it.id, { title })} maxLength={DOL_LIMITS.itemTitle} invalid={!it.title.trim()} />
            <TextField label="한 줄" value={it.text} onChangeText={(text) => edit(it.id, { text })} maxLength={DOL_LIMITS.itemText} />
            <PhotoOne label="사진" uri={it.photo} onChange={(photo) => edit(it.id, { photo })} />
          </View>
        )}
      />
    </View>
  );
}

/** 마음 전하는 곳: 안내 문구 + 보호자별 계좌 (한 명 이상) */
export function DolAccountForm() {
  const c = useDol();
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextArea label="안내 문구" value={c.account.message} onChangeText={(message) => patch('account', { message })} maxLength={LIMITS.accountMessage} minHeight={90} />
      {c.basic.guardians.map((g) => (
        <AccountFields
          key={g.id}
          label={`${g.relation || '보호자'} ${g.name}`.trim()}
          account={c.account.accounts[g.id] ?? { bank: '', number: '' }}
          onChange={(a) => patch('account', { accounts: { ...c.account.accounts, [g.id]: a } })}
        />
      ))}
      <Hint>보호자는 기본 정보에서 바꿀 수 있어요. 한 명 이상 계좌를 넣어 주세요.</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  side: { marginTop: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.sm },
  narrow: { flex: 2 },
  wide: { flex: 3 },
  photo: { width: 96, height: 120, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderStyle: 'dashed' },
  addRequired: { borderColor: colors.danger },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  dateBox: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.brandTint },
});
```
  (`TextField`·`TextArea` 의 실제 prop 이름이 다르면 그 파일 정의를 따른다 — `label`, `required`, `invalid`, `maxLength`, `placeholder` 는 지금 `TextForms.tsx` 가 쓰는 것과 같다. `Txt` 의 `raw` prop 은 이미 있다.)

  - `SectionSheet.tsx`: 돌잔치면 basic·profile·timeline·account 를 돌잔치 폼으로, 나머지(ceremony·greeting·gallery·guestbook·ending·bgm)는 공통 폼.

```tsx
const dol = draft.themeId === 'dol';
{section === 'basic' && (dol ? <DolBasicForm /> : <BasicForm />)}
{section === 'profile' && <DolProfileForm />}
{section === 'timeline' && <DolTimelineForm />}
{section === 'account' && (dol ? <DolAccountForm /> : <AccountForm />)}
```
  - 공통 `GreetingForm` 의 "신랑, 신부 이름 삽입" 체크 글자는 돌잔치면 "보호자 이름 삽입", 안내는 "인사말 마지막에 보호자 이름이 들어가요." (`GreetingForm` 이 `draft.themeId` 를 읽어 분기, `asWedding` 대신 공통 필드 `greeting` 만 읽게).
  - i18n: 이 Task 의 모든 새 한국어 문구.

- [ ] **Step 5: 확인** — Run: `npx jest && npx tsc --noEmit && npx eslint src/features/invitation` / Expected: 통과, 오류 0, 새 린트 오류 없음

- [ ] **Step 6: 커밋**
```bash
git add src && git commit -m "feat: 돌잔치 입력 폼 — 기본 정보·아이 프로필·성장 이야기·마음 전하는 곳"
```

---

### Task 8: 돌잔치 하객 화면 장

**Files:**
- Create: `src/features/invitation/view/DolPages.tsx`
- Modify: `src/features/invitation/view/PageContent.tsx`, `src/features/invitation/view/GreetingPage.tsx`, `src/features/invitation/view/CeremonyPage.tsx`, `src/features/invitation/dol.ts` (화면 문장 함수)
- Test: `src/features/invitation/__tests__/dol.test.ts` (문장 함수 추가)

**Interfaces:**
- Produces:
  - `dol.ts`: `bornLine(b: DolBasic): string` → `'2025년 4월 26일에 태어난'`(영어: `'Born on April 26, 2025'` — `formatYearMonth` 처럼 `isEn()` 분기 함수로), `treasureLine(b: DolBasic): string` → `'이윤종 · 이다영의 보물'`(보호자 이름 없으면 `''`), `ddayLine(c: DolContent, daysLeft: number): string` → `'시안이의 첫 생일까지 3일'`
  - `DolProfilePage({ content })`, `DolTimelinePage({ content })`, `DolAccountPage({ content })`
  - `CeremonyPage` 에 `ddayText?: (daysLeft: number) => string`, `todayText?: string` prop (없으면 지금 결혼식 문장)

- [ ] **Step 1: 실패하는 테스트** (dol.test.ts 에 추가)

```ts
it('하객 화면 문장', () => {
  const b = { ...defaultDolContent(today).basic, childName: '이시안', birthDate: '2025-04-26' };
  b.guardians = b.guardians.map((g, i) => ({ ...g, name: ['이윤종', '이다영'][i] }));
  expect(bornLine(b)).toBe('2025년 4월 26일에 태어난');
  expect(treasureLine(b)).toBe('이윤종 · 이다영의 보물');
  const c = { ...defaultDolContent(today), basic: b };
  expect(ddayLine(c, 3)).toBe('시안이의 첫 생일까지 3일');
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/dol.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현**
  - `dol.ts` 문장 함수 (`currentLocale()` 로 영어 분기, 한국어 쪽 템플릿 문자열 앞에 `/* i18n-ignore */`):

```ts
export function bornLine(b: DolBasic): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate)) return '';
  const d = parseDate(b.birthDate);
  return currentLocale() === 'en'
    ? `Born on ${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : /* i18n-ignore */ `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 태어난`;
}
export const treasureLine = (b: DolBasic) => {
  const names = guardianNames(b);
  if (!names) return '';
  return currentLocale() === 'en' ? `Treasure of ${names}` : /* i18n-ignore */ `${names}의 보물`;
};
export const ddayLine = (c: DolContent, daysLeft: number) =>
  currentLocale() === 'en'
    ? `${daysLeft} days until ${nicknameOf(c.basic)}'s first birthday`
    : /* i18n-ignore */ `${withSubjectSuffix(nicknameOf(c.basic) || '아이')} 첫 생일까지 ${daysLeft}일`;
```
  (`MONTHS_EN` 을 `model.ts` 에서 export, `withSubjectSuffix` 는 Task 6 의 함수를 `dol.ts` 로 옮겨 export 하고 canvas 가 import)
  - `DolPages.tsx` (`look.tsx` 의 `Page`, `PageTitle`, `IText`, `useLook`):

```tsx
export function DolProfilePage({ content }: { content: DolContent }) {
  const { basic, profile } = content;
  return (
    <Page>
      <PageTitle>오늘의 주인공</PageTitle>
      {profile.photo && <Image source={{ uri: profile.photo }} style={styles.round} resizeMode="cover" />}
      <IText size={22} bold raw={!!basic.childName}>{basic.childName || '아이 이름'}</IText>
      {!!bornLine(basic) && <IText tone="sub">{bornLine(basic)}</IText>}
      {!!treasureLine(basic) && <IText tone="sub" raw>{treasureLine(basic)}</IText>}
      {!!profile.intro && <IText raw>{profile.intro}</IText>}
      {profile.hashtags.length > 0 && <IText tone="accent" raw>{profile.hashtags.map((h) => `#${h}`).join(' ')}</IText>}
    </Page>
  );
}

export function DolTimelinePage({ content }: { content: DolContent }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>성장 이야기</PageTitle>
      <View style={styles.timeline}>
        {content.timeline.items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: look.accent }]} />
            <View style={styles.itemBody}>
              {!!it.date && <IText size={13} tone="accent" align="left">{formatShortDate(it.date)}</IText>}
              <IText bold align="left" raw>{it.title}</IText>
              {!!it.text && <IText size={14} tone="sub" align="left" raw>{it.text}</IText>}
              {it.photo && <Image source={{ uri: it.photo }} style={styles.itemPhoto} resizeMode="cover" />}
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

export function DolAccountPage({ content }: { content: DolContent }) {
  const rows = content.basic.guardians.flatMap((g) => {
    const a = content.account.accounts[g.id];
    return a && a.bank.trim() && a.number.trim() ? [{ label: g.relation, person: { name: g.name, title: g.relation, deceased: false }, account: a }] : [];
  });
  return (
    <Page>
      <PageTitle>마음 전하는 곳</PageTitle>
      {!!content.account.message && <IText tone="sub" raw>{content.account.message}</IText>}
      {rows.map((r) => <AccountRow key={r.label + r.person.name} row={r} />)}
    </Page>
  );
}
```
  (`AccountRow` 를 `AccountPage.tsx` 에서 export 해서 쓴다. `formatShortDate(date)` 는 `model.ts` 에 추가: 한국어 `'25년 4월 26일'`, 영어 `'Apr 26, 2025'`. 스타일: `round` = 160×160 원, 타임라인은 왼쪽 세로선 + 점 — `timeline: { width: '100%', gap: spacing.lg, borderLeftWidth: 1, borderColor: look.sub + '44', paddingLeft: spacing.lg }`(색은 렌더에서 넣음), `dot` 10×10 원을 `position: 'absolute', left: -spacing.lg - 5`.)
  - `PageContent.tsx`: `isDol(content)` 면 `profile`·`timeline`·`account` 는 위 부품, `greeting` 은 `GreetingPage` 가 돌잔치 분기, `ceremony` 는 `<CeremonyPage ceremony={content.ceremony} ddayText={(n) => ddayLine(content, n)} todayText="오늘이 첫 생일이에요" />`. `page` 타입은 `Exclude<PageKey, 'cover'>`.
  - `GreetingPage.tsx`: `content: InvitationContent` 를 받고 `isDol(content)` 면 가족 줄 대신 `guardianLine`(보호자 `관계 이름` 을 ' · ' 로) 한 줄, 서명은 `appendNames` 이면 `${guardianNames(basic)} 드림.`.
  - `CeremonyPage.tsx`: `Dday` 가 `ddayText`·`todayText` 를 받아 쓰고, 없으면 지금 결혼식 문장.
  - i18n: 오늘의 주인공·성장 이야기·마음 전하는 곳·아이 이름·오늘이 첫 생일이에요 등.

- [ ] **Step 4: 확인** — Run: `npx jest && npx tsc --noEmit` / Expected: 통과, 오류 0

- [ ] **Step 5: 커밋**
```bash
git add src && git commit -m "feat: 돌잔치 하객 화면 — 아이 프로필·성장 이야기·마음 전하는 곳·D-day 문장"
```

---

### Task 9: 테마별 독바·라벨·입력항목 선택 마무리

**Files:**
- Modify: `src/features/invitation/editor/pages.ts`, `src/features/invitation/editor/DockBar.tsx`, `src/app/create/editor/compose.tsx`
- Test: `src/features/invitation/__tests__/pages.test.ts`

**Interfaces:**
- Produces: `PAGE_SECTION` 에 `profile: 'profile', timeline: 'timeline'`. `dockItems(inv)` 그대로(장 순서는 `pageOrder` 가 profile·timeline 포함). `DockBar` 라벨은 `themeDef(invitation.themeId).pageLabel/sectionLabel`.

- [ ] **Step 1: 실패하는 테스트** (pages.test.ts 에 추가)

```ts
it('돌잔치 독바: 표지·인사말 다음 아이 프로필·성장 이야기, 정보 칩은 기본정보', () => {
  const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'dol', templateId: 'dol-1' });
  const items = dockItems(inv);
  expect(items.map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
    'cover', 'greeting', 'profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account', 'ending', 'info:basic',
  ]);
  expect(movablePages(inv)).toEqual(['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account']);
});
```
  (`createInvitation` 은 `../themes` 에서, `import '../registerThemes';`)

- [ ] **Step 2: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/pages.test.ts` / Expected: FAIL (PAGE_SECTION 에 profile 없음 등)

- [ ] **Step 3: 구현**
  - `pages.ts`: `PAGE_SECTION` 에 두 키 추가. `movablePages` 의 `p === 'ceremony' || inv.enabled[p]` 그대로(`!!`).
  - `DockBar.tsx`: `PAGE_LABEL[item.page]` → `def.pageLabel(item.page)`, `SECTION_LABEL[item.section]` → `def.sectionLabel(item.section)` (`const def = themeDef(invitation.themeId)`).
  - `compose.tsx`: `[직접 꾸미기]` 는 표지에서만(지금처럼 `CANVAS_PAGES`). 저장 이름 기본값 안내 등 결혼식 문구가 있으면 테마 중립 문구로.

- [ ] **Step 4: 확인** — Run: `npx jest && npx tsc --noEmit` / Expected: 통과

- [ ] **Step 5: 커밋**
```bash
git add src && git commit -m "feat: 테마별 독바 순서·라벨 (돌잔치 아이 프로필·성장 이야기)"
```

---

### Task 10: 돌잔치 템플릿 미리보기와 예시(AI 사진)

**Files:**
- Create: `assets/sample/dol/*.jpg` (10장)
- Modify: `src/features/invitation/sample.ts`, `src/app/create/[theme]/[templateId].tsx`
- Test: `src/features/invitation/__tests__/sample.test.ts`

**Interfaces:**
- Produces: `sampleInvitation(themeId: string, templateId: string, today?: Date): Invitation` (결혼식·돌잔치). 미리보기 화면은 `themeId === 'wedding' || themeId === 'dol'` 이면 실제 초대장 화면(`InvitationView`).

- [ ] **Step 1: AI 사진 생성** (Higgsfield MCP, 모델 `z_image`, 무료 요금제에서 동작 확인됨. 한 번에 3~4장씩, 429 면 나눠서)
  - 0 `cover.jpg` (3:4): "Photorealistic portrait of a smiling Korean baby around 12 months old in a cream knit outfit, sitting on a soft blanket, pastel background, soft window light, no text"
  - 1 `profile.jpg` (1:1): "Photorealistic close-up of a happy Korean one-year-old baby laughing, natural light, shallow depth of field, no text"
  - 2 `born.jpg` (4:3): "Photorealistic newborn baby's tiny hand holding a parent's finger, soft white blanket, warm light, no text"
  - 3 `day100.jpg` (4:3): "Photorealistic Korean baby around 100 days old lying on a pastel blanket smiling, top-down view, no text"
  - 4 `walk.jpg` (4:3): "Photorealistic toddler taking first steps holding a parent's hands in a bright living room, no faces of parents, no text"
  - 5 `first.jpg` (4:3): "Photorealistic Korean doljanchi first birthday table with rice cakes, fruits and a small cake, a baby in pastel hanbok sitting in front, no text"
  - 6~9 `gallery-1..4.jpg` (3:4): 돌 한복 입은 아기 / 엄마 품의 아기 뒷모습 / 아기 장난감과 풍선 / 가족이 아기를 안고 산책(얼굴 일부) — 각 "Photorealistic …, no text"
  - 결과를 내려받아 PowerShell `System.Drawing` 으로 긴 변 1080px JPEG(품질 80)로 줄여 `assets/sample/dol/` 에 저장(결혼식 때와 같은 방법). 손·얼굴이 어색한 사진은 다시 만든다(한 장당 0.15크레딧 내외).

- [ ] **Step 2: 실패하는 테스트** (sample.test.ts 에 추가)

```ts
it('돌잔치 예시: 모든 입력 탭이 검사를 통과하고 사진이 들어 있다', () => {
  const inv = sampleInvitation('dol', 'dol-1');
  expect(inv.themeId).toBe('dol');
  for (const k of sectionTabs(inv)) expect([k, validateFor(inv, k)]).toEqual([k, []]);
  const c = inv.content as DolContent;
  expect(c.basic.photo).toEqual(expect.any(String));
  expect(c.timeline.items).toHaveLength(4);
  expect(c.timeline.items.every((i) => !!i.photo)).toBe(true);
});
```
  (기존 결혼식 테스트의 `sampleInvitation('wedding-1')` 호출은 `sampleInvitation('wedding', 'wedding-1')` 로 바꾼다)

- [ ] **Step 3: 실패 확인** — Run: `npx jest src/features/invitation/__tests__/sample.test.ts` / Expected: FAIL

- [ ] **Step 4: 구현** — `sample.ts`
  - 기존 함수 이름을 `weddingSample(templateId, today)` 로 바꾸고, `sampleInvitation(themeId, templateId, today = new Date())` 가 테마별로 고른다.
  - 돌잔치 예시: 아이 "이시안", 태어난 날 = 오늘 − 1년 + 7일, 행사일 = 태어난 날 + 1년(일요일 낮 12시 아님 — 그냥 그 날), 보호자 아빠 이윤종 / 엄마 이다영(계좌 신한 110-123-456789 / 국민 123-45-678901), 장소 "비비드 파티룸", 주소 "경기 성남시 분당구 정자일로 95", 프로필 소개 "울다 웃다 자다\n그렇게 1년, 이제 돌이에요", 해시태그 ['웃음요정', '잠꾸러기'], 성장 이야기는 `seedTimeline([], birth, event)` 에 사진 4장(born·day100·walk·first)과 첫 걸음마 날짜(태어난 날 + 300일)를 채운다. 표지 사진 cover.jpg, 프로필 사진 profile.jpg, 갤러리 gallery-1..4 + profile + first (6장 ≥ 4), 완료 표시 모두 true.
  - 사진은 결혼식 예시처럼 `Asset.fromModule(require(...)).uri`.
  - `[templateId].tsx`: `const wedding = themeId === 'wedding'` → `const full = themeId === 'wedding' || themeId === 'dol'`, `sampleInvitation(themeId, templateId)`.
  - i18n: 예시 문구 중 화면 고정 문구가 아닌 사용자 글(이름·소개)은 번역 사전에 넣지 않는다(누락 검사는 코드 속 문자열을 보므로 `sample.ts` 의 예시 사용자 글 문자열 앞에 `/* i18n-ignore */`).

- [ ] **Step 5: 확인** — Run: `npx jest && npx tsc --noEmit` / Expected: 통과

- [ ] **Step 6: 커밋**
```bash
git add assets/sample/dol src && git commit -m "feat: 돌잔치 템플릿 미리보기 — 예시 초대장과 AI 실사 사진"
```

---

### Task 11: 마무리 검사·브라우저 QA·기록

**Files:**
- Modify: 결함이 나온 파일
- Test: 전체

- [ ] **Step 1: 전체 검사** — Run: `npx tsc --noEmit && npx jest && npx expo lint` / Expected: 오류 0, 전체 통과, 린트 23 errors / 7 warnings 이하

- [ ] **Step 2: 브라우저 QA** (개발 서버가 꺼져 있으면 `CI=false npx expo start --web --port 8081` 백그라운드로 켠다. Playwright MCP)
  1. `/create/dol` → 템플릿 10종 카드가 파스텔·둥근 서체
  2. `/create/dol/dol-1` 미리보기: 스토리형·스크롤형, 표지 사진 틀, 아이 프로필, 성장 이야기 4개, 일시·장소("시안이의 첫 생일까지 ○일"), 갤러리, 계좌, 412·1280 폭
  3. [이 템플릿으로 만들기] → 입력항목 선택(돌잔치 문구·아이 프로필·성장 이야기 스위치) → [정보 입력]
  4. 기본 정보: 이름·태어난 날·표지 사진(작은 png 업로드)·보호자 추가/삭제 → 성장 이야기 4개 자동 → 빨간 점이 사라질 때까지 채우기 → 최종저장 → 나의 초대장 썸네일
  5. [색상] 칩이 돌잔치 10색, 표지 [직접 꾸미기]의 정보 글자 목록이 돌잔치용, 사진 틀 바꾸기
  6. 결혼식 회귀: `/create/wedding/wedding-1` 미리보기와 만들기 첫 화면이 전과 같은지
  7. 영어 모드에서 돌잔치 미리보기 한 번
  스크린샷 `.playwright-mcp/dol-*.jpg`.
- [ ] **Step 3: 결함 수정** — 결함마다 실패 테스트 → 수정 → 전체 검사 → 커밋 `fix: …`
- [ ] **Step 4: HTML 보고서** — 메모리 규칙대로 결과를 HTML 아티팩트로(한국어): 한 일, 스크린샷, 내린 판단(Ruling), 미룬 것, 다음 단계(기업 행사).
