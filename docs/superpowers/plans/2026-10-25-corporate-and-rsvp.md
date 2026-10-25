# 기업 행사 + 참석 응답 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기업 행사 초대장을 결혼식·돌잔치와 같은 수준(템플릿 미리보기 → 입력항목 선택 → 정보 입력 → 저장·활성화 → 하객 화면)으로 만들고, 기업·모임이 같이 쓸 참석 응답(하객 신청 + 만든 사람의 명단 관리)을 넣는다.

**Architecture:** 돌잔치 때 만든 테마 정의(`themes.ts` · `registerTheme`)에 `corporate` 를 하나 더 등록한다. 콘텐츠는 `CorporateContent`(theme: 'corporate')로 유니언에 더하고, 일시·장소는 공통 `CeremonyInfo` 를 넓힌 `CorporateCeremony`(대상·드레스코드 추가)로 쓴다. 참석 응답은 초대장과 따로 저장하는 `RsvpService`(mock, 자체 저장 키)와 순수 함수 모음 `features/rsvp/rsvp.ts` 로 나누고, 하객 화면은 장 안의 버튼 → 입력 모달 구조로 스토리형 넘김 제스처와 부딪히지 않게 한다.

**Tech Stack:** Expo SDK 57, expo-router, React Native + react-native-web, TypeScript, Zustand, AsyncStorage, Jest(jest-expo).

**Spec:** `docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md` (2·4·6·7·9·10장, 11장의 3단계)

## Global Constraints

- 결혼식·돌잔치 화면과 데이터는 바뀌지 않는다. 옛 저장본(`content.theme` 없음)은 결혼식으로 열린다.
- 패키지는 `npx expo install` 로만 설치(이번 계획은 새 패키지 없음). `ios/`·`android/` 폴더를 만들지 않는다.
- 완료 전 `npx tsc --noEmit`, `npx jest`, `npx expo lint`(지금 21 errors / 7 warnings 보다 늘면 안 됨).
- 대화·주석·커밋은 한국어. 커밋 끝 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. main 병합·푸시 금지(브랜치 `feat/phase1-frontend`).
- 새 화면 문구는 모두 영어 사전(`src/i18n/en/*.ts`)에 넣는다. 추가는 `node "<scratchpad>/addEn.js" '{"한국어":"English"}'` (part1~4에 이미 있는 키는 건너뜀). 계획 안의 `<scratchpad>` = `C:/Users/oh34s/AppData/Local/Temp/claude/C--Users-oh34s-invite-app/2b79f2b6-596d-4cc0-9a63-ac17dd143021/scratchpad` (스크립트가 없으면 `src/i18n/en/part1.ts` 맨 앞에 직접 넣는다). 사용자 글은 `raw` 로 그려 번역하지 않는다.
- 사용자가 고치는 기본 문구(초청 인사·엔딩·프로그램 예시·드레스코드 칩 값)는 **만들 때 사용자 언어**(`currentLocale()`)로 넣는다(번역 사전을 거치지 않음).
- prettier 는 `--single-quote --print-width 120` 으로 **고친 줄만**. 기존 줄을 펼치면 되돌린다.
- 기업 장 구성(설계 4장): 표지·초청 인사(고정 앞) / 행사 개요·오시는 길(늘 켬, 이동) / 프로그램(켬)·연사 소개(끔)·참석 신청(켬)·문의처(켬) / 엔딩(켬, 맨 끝). 방명록·계좌·갤러리는 없다.
- 기업 한도: 행사명 30자, 주최 20자, 초청인 이름 10자·직함 15자, 대상 50자, 드레스코드 20자, 프로그램 1~12개(제목 30자·담당/설명 50자), 연사 1~6명(이름 10자·직함 20자·한 줄 50자), 주차·교통 각 200자, 문의 담당자 10자.
- 참석 응답 받는 항목(설계 6장, 끌 수 없음): 기업 = 이름·소속·연락처·참석/불참, 모임 = 이름·참석/불참·동반 인원(0~9). 이번 계획은 모임 화면을 만들지 않지만 `rsvp.ts` 는 두 테마 항목을 다 안다.
- 템플릿 10종: 차분한 색, 고딕(`font: 'sans'`).
- 예시 사진: 기업 6장(행사장 2·연사 얼굴 3·로고 1), 무료 모델(Z Image), 긴 변 1080px JPEG(로고는 PNG 512px 허용), 실존 인물·실존 회사 아님, 미리보기에만 쓴다.

## Review Focus

1. 스토리형 하객 화면의 참석 신청 장 — 입력칸을 누르다 장이 넘어가면 안 된다. 장 안에는 버튼만 두고 입력은 모달에서 받는다 → Task 7 (화면 구조), Task 9 브라우저 QA 항목.
2. 마감일이 지난 뒤 이미 응답한 하객이 다시 엶 — 낸 내용은 보이지만 고칠 수 없고 "마감되었어요" → Task 4 테스트(`submit` 이 `closed`), Task 7 화면.
3. 같은 기기에서 두 번 냄 — 새 행이 생기지 않고 같은 행이 고쳐진다(명단 수 그대로) → Task 4 테스트.
4. 로고를 넣지 않은 기업 표지 — 빈 사진 틀(“표지 사진”)이 아니라 아무것도 그리지 않는다 → Task 5 테스트(`resolvePhoto` null) + ElementView 분기.
5. 문의처 전화·메일 형식 — 하이픈 있음/없음 전화 모두 통과, 잘못된 메일은 막는다, 둘 다 비면 막는다 → Task 2 테스트.

---

### Task 1: 콘텐츠 타입에 기업 행사 더하기 · 늘 켜진 장 일반화

**Files:**
- Modify: `src/features/invitation/model.ts`
- Modify: `src/features/invitation/editor/pages.ts`
- Modify: tsc 가 가리키는 결혼식·돌잔치 공통 부품 (Step 5)
- Test: `src/features/invitation/__tests__/themeContent.test.ts`, `src/features/invitation/__tests__/pages.test.ts`

**Interfaces:**
- Produces:
  - `SectionKey` 에 `'program' | 'speakers' | 'directions' | 'rsvp' | 'contact'` 추가. `PageKey`·`ReorderablePage` 에도 같은 다섯. `OptionalSection` 에 `'program' | 'speakers' | 'rsvp' | 'contact'` (directions 는 늘 켬이라 넣지 않음).
  - `export const ALWAYS_ON: ReorderablePage[] = ['ceremony', 'directions']`
  - `CorporateBasic { eventName: string; host: string; logo: string | null; inviterTitle: string; inviterName: string }`
  - `CorporateCeremony extends CeremonyInfo { audience: string; dressCode: string }`
  - `ProgramItem { id: string; time: string; title: string; detail: string }` (time 은 'HH:mm' 또는 '')
  - `Speaker { id: string; photo: string | null; name: string; title: string; line: string }`
  - `CorporateDirections { parking: string; transit: string }`
  - `RsvpSettings { deadline: string }` ('' = 마감 없음, 아니면 'YYYY-MM-DD')
  - `ContactInfo { name: string; phone: string; email: string }`
  - `CorporateContent { theme: 'corporate'; basic: CorporateBasic; ceremony: CorporateCeremony; greeting: GreetingInfo; program: { items: ProgramItem[] }; speakers: { items: Speaker[] }; directions: CorporateDirections; rsvp: RsvpSettings; contact: ContactInfo; ending: EndingInfo; bgm: BgmInfo }`
  - `InvitationContent = WeddingContent | DolContent | CorporateContent`
  - `isCorporate(c): c is CorporateContent`, `isWedding(c): c is WeddingContent` (theme 없음 또는 'wedding')
  - `asWedding` 는 `!isWedding(c)` 면 던진다.
  - `withGallery(c: InvitationContent): WeddingContent | DolContent` — 기업이면 던진다(갤러리·방명록 부품 전용).

- [ ] **Step 1: 실패하는 테스트**

`themeContent.test.ts` 끝에 더한다:

```ts
import { isCorporate, isWedding, withGallery } from '../model';
import type { CorporateContent } from '../model';

describe('기업 행사 콘텐츠 구분', () => {
  const corp = { theme: 'corporate' } as CorporateContent;
  it('theme 으로 기업·결혼식을 가른다', () => {
    expect(isCorporate(corp)).toBe(true);
    expect(isWedding(corp)).toBe(false);
    expect(isWedding(defaultContent())).toBe(true);
  });
  it('기업에는 갤러리 부품을 쓰지 않는다', () => {
    expect(() => withGallery(corp)).toThrow();
    expect(() => asWedding(corp)).toThrow();
  });
});
```

`pages.test.ts` 끝에 더한다:

```ts
import { pageOrder } from '../model';
import { movablePages } from '../editor/pages';

describe('늘 켜진 장', () => {
  it('오시는 길은 enabled 와 상관없이 순서에 들어간다', () => {
    const order = ['ceremony', 'program', 'directions', 'rsvp'] as const;
    expect(pageOrder({ program: true }, [...order])).toEqual(['cover', 'greeting', 'ceremony', 'program', 'directions']);
    expect(movablePages({ enabled: {}, order: [...order] })).toEqual(['ceremony', 'directions']);
  });
});
```

(이미 파일 위에 같은 이름 import 가 있으면 합친다.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/themeContent.test.ts src/features/invitation/__tests__/pages.test.ts`
Expected: FAIL — `isCorporate is not a function`, `withGallery is not a function`, pageOrder 결과에 'directions' 없음.

- [ ] **Step 3: 타입·함수 구현 (`model.ts`)**

1. `SectionKey` 끝에:

```ts
  // 기업 행사 (+ 참석 응답은 모임도 씀)
  | 'program'
  | 'speakers'
  | 'directions'
  | 'rsvp'
  | 'contact';
```

`OptionalSection` 에 `| 'program' | 'speakers' | 'rsvp' | 'contact'`, `PageKey`·`ReorderablePage` 에 `| 'program' | 'speakers' | 'directions' | 'rsvp' | 'contact'`.

2. `DolContent` 아래에:

```ts
// ── 기업 행사 (설계 4장) ──

export interface CorporateBasic {
  eventName: string;
  /** 주최 (회사·단체명) */
  host: string;
  logo: string | null;
  /** 초청인 직함·이름 — 둘 다 비우거나 둘 다 넣는다 */
  inviterTitle: string;
  inviterName: string;
}

/** 일시·장소(공통) + 대상·드레스코드 */
export interface CorporateCeremony extends CeremonyInfo {
  audience: string;
  dressCode: string;
}

export interface ProgramItem {
  id: string;
  /** HH:mm 또는 '' */
  time: string;
  title: string;
  /** 담당·설명 */
  detail: string;
}

export interface Speaker {
  id: string;
  photo: string | null;
  name: string;
  title: string;
  line: string;
}

export interface CorporateDirections {
  parking: string;
  transit: string;
}

/** 참석 신청 설정 — 받는 항목은 테마가 정한다 (features/rsvp/rsvp.ts) */
export interface RsvpSettings {
  /** '' = 마감 없음 */
  deadline: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface CorporateContent {
  theme: 'corporate';
  basic: CorporateBasic;
  ceremony: CorporateCeremony;
  greeting: GreetingInfo;
  program: { items: ProgramItem[] };
  speakers: { items: Speaker[] };
  directions: CorporateDirections;
  rsvp: RsvpSettings;
  contact: ContactInfo;
  ending: EndingInfo;
  bgm: BgmInfo;
}
```

3. 유니언·판별:

```ts
export type InvitationContent = WeddingContent | DolContent | CorporateContent;

export const isDol = (c: InvitationContent): c is DolContent => c.theme === 'dol';
export const isCorporate = (c: InvitationContent): c is CorporateContent => c.theme === 'corporate';
/** 옛 저장본은 theme 이 없다 */
export const isWedding = (c: InvitationContent): c is WeddingContent => !c.theme || c.theme === 'wedding';

/** 결혼식 전용 부품에서만 쓴다 — 다른 테마가 들어오면 화면 연결이 잘못된 것 */
export function asWedding(c: InvitationContent): WeddingContent {
  if (!isWedding(c)) throw new Error(/* i18n-ignore */ '결혼식 초대장이 아니에요');
  return c;
}

/** 갤러리·방명록이 있는 테마 (결혼식·돌잔치) 전용 부품에서 쓴다 */
export function withGallery(c: InvitationContent): WeddingContent | DolContent {
  if (isCorporate(c)) throw new Error(/* i18n-ignore */ '갤러리가 없는 초대장이에요');
  return c;
}
```

4. 라벨 (`SECTION_LABEL`, `PAGE_LABEL` 둘 다):

```ts
  program: '프로그램',
  speakers: '연사 소개',
  directions: '오시는 길',
  rsvp: '참석 신청',
  contact: '문의처',
```

5. `pageOrder`:

```ts
/** 늘 켜진 이동 장 (입력항목 선택에서 끌 수 없다) */
export const ALWAYS_ON: ReorderablePage[] = ['ceremony', 'directions'];

export function pageOrder(enabled: EnabledSections, order: ReorderablePage[]): PageKey[] {
  const middle = order.filter((p) => ALWAYS_ON.includes(p) || !!enabled[p as OptionalSection]);
  return ['cover', 'greeting', ...middle, ...(enabled.ending ? (['ending'] as const) : [])];
}
```

- [ ] **Step 4: `pages.ts`**

`PAGE_SECTION` 에 다섯 키를 같은 이름으로 더하고, `movablePages` 를 바꾼다:

```ts
export const movablePages = (inv: OrderSource): ReorderablePage[] =>
  inv.order.filter((p) => ALWAYS_ON.includes(p) || inv.enabled[p as OptionalSection]);
```

(`ALWAYS_ON`, `OptionalSection` 을 `../model` 에서 import. 주석 "예식 정보는 늘 켜져 있다" → "행사 개요·오시는 길은 늘 켜져 있다".)

- [ ] **Step 5: 타입 오류 정리**

Run: `npx tsc --noEmit`
Expected: 유니언에 기업이 늘어 `content.gallery`·`content.guestbook`·`content.basic.groom` 등을 읽는 곳에서 오류. 고치는 규칙:
- 갤러리·방명록 부품(`MediaForms.tsx` 의 `GalleryForm`, `PageContent.tsx` 의 `gallery`·`guestbook` 분기 등): `withGallery(content).gallery` 처럼 감싼다.
- `isDol(c) ? 돌잔치 : 결혼식` 꼴로 결혼식을 "돌잔치가 아니면"으로 고른 곳: 결혼식 쪽을 `asWedding(c)` 로 감싸거나 `isWedding(c)` 로 조건을 바꾼다. 기업 분기는 Task 6·7 에서 넣으므로 여기서는 결혼식 쪽 타입만 맞춘다.
- `editorStore.ts` 의 `prev` 읽기 같은 `Record<string, object>` 캐스팅은 그대로 둔다.
- `canvas/model.ts` `resolveBind` 의 결혼식 끝부분: `const w = asWedding(c);` 로 받아 `w.basic.groom` 을 읽는다(기업 분기는 Task 5).
다시 `npx tsc --noEmit` → 0.

- [ ] **Step 6: 통과 확인**

Run: `npx jest`
Expected: 전부 PASS (새 테스트 포함).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 콘텐츠 타입에 기업 행사 더하기 — 장 키 5개, 늘 켜진 장(행사 개요·오시는 길) 일반화

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 기업 행사 기본값·검사·테마 등록

**Files:**
- Create: `src/features/invitation/corporate.ts`
- Modify: `src/features/invitation/registerThemes.ts`
- Test: `src/features/invitation/__tests__/corporate.test.ts`

**Interfaces:**
- Consumes: Task 1 의 타입, `registerTheme`, `validateSection`, `defaultContent`, `newItemId`(`editor/listOps`), `currentLocale`, `isDateString`.
- Produces:
  - `CORP_LIMITS` (Global Constraints 의 한도)
  - `defaultCorporateContent(today?: Date): CorporateContent`
  - `defaultCorporateGreeting(): string`, `defaultCorporateEnding(): string` (언어별)
  - `DRESS_CODES(): string[]` (언어별 칩 값 3개)
  - `isPhone(s: string): boolean`, `isEmail(s: string): boolean`
  - `validateCorporate(key: SectionKey, c: CorporateContent): string[]`
  - `inviterLine(b: CorporateBasic): string` — '대표이사 김우주' (비면 '')
  - `corporateTheme: ThemeDef` (id 'corporate', 등록됨)

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/invitation/__tests__/corporate.test.ts
import { useLocale } from '../../../i18n';
import {
  defaultCorporateContent,
  DRESS_CODES,
  inviterLine,
  isEmail,
  isPhone,
  validateCorporate,
} from '../corporate';
import type { CorporateContent } from '../model';
import '../registerThemes';
import { createInvitation, sectionTabs, themeDef } from '../themes';

const today = new Date(2026, 9, 25);
const base = () => defaultCorporateContent(today);
const filledBasic = (c: CorporateContent): CorporateContent => ({
  ...c,
  basic: { ...c.basic, eventName: '파트너스 데이', host: '우주컴퍼니' },
});

describe('기업 행사', () => {
  afterEach(() => useLocale.setState({ locale: 'ko' }));

  it('기본값: 프로그램 예시 3개, 연사 없음, 마감 없음, 초청 인사 미리 채움', () => {
    const c = base();
    expect(c.theme).toBe('corporate');
    expect(c.program.items.map((i) => i.title)).toEqual(['등록', '개회사', '본 행사']);
    expect(c.speakers.items).toEqual([]);
    expect(c.rsvp.deadline).toBe('');
    expect(c.greeting.content.length).toBeGreaterThan(0);
    expect(c.ceremony.date).toBe('2026-11-01');
  });
  it('영어 사용자는 기본 문구·예시·드레스코드 칩이 영어', () => {
    useLocale.setState({ locale: 'en' });
    const c = base();
    for (const s of [c.greeting.content, c.ending.content, ...c.program.items.map((i) => i.title), ...DRESS_CODES()])
      expect(s).not.toMatch(/[가-힣]/);
  });
  it('테마 등록: 입력 탭과 장 순서', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today });
    expect(sectionTabs(inv)).toEqual(['basic', 'ceremony', 'greeting', 'directions', 'program', 'rsvp', 'contact', 'ending']);
    expect(inv.order).toEqual(['ceremony', 'program', 'speakers', 'directions', 'rsvp', 'contact']);
    expect(themeDef('corporate').sectionLabel('ceremony')).toBe('행사 개요');
    expect(themeDef('corporate').pageLabel('greeting')).toBe('초청 인사');
    expect(themeDef('corporate').optional.map((s) => s.key)).not.toContain('guestbook');
  });
  it('기본 정보: 행사명·주최 필수, 초청인은 둘 다 넣거나 둘 다 비움', () => {
    expect(validateCorporate('basic', base())).toEqual(['eventName', 'host']);
    const c = filledBasic(base());
    expect(validateCorporate('basic', c)).toEqual([]);
    expect(validateCorporate('basic', { ...c, basic: { ...c.basic, inviterName: '김우주' } })).toEqual(['inviter']);
    expect(validateCorporate('basic', { ...c, basic: { ...c.basic, eventName: 'x'.repeat(31) } })).toEqual(['eventName']);
  });
  it('행사 개요: 공통 일시·장소 규칙 + 대상·드레스코드 길이', () => {
    const c = base();
    const ok = { ...c, ceremony: { ...c.ceremony, venue: '그랜드홀', address: '서울 강남구 테헤란로 521' } };
    expect(validateCorporate('ceremony', ok)).toEqual([]);
    expect(validateCorporate('ceremony', { ...ok, ceremony: { ...ok.ceremony, dressCode: 'x'.repeat(21) } })).toEqual([
      'dressCode',
    ]);
  });
  it('프로그램: 1~12개, 제목 필수, 시간은 HH:mm 또는 빈칸', () => {
    const c = base();
    expect(validateCorporate('program', c)).toEqual([]);
    expect(validateCorporate('program', { ...c, program: { items: [] } })).toEqual(['items']);
    const bad = { ...c.program.items[0], time: '25:00' };
    expect(validateCorporate('program', { ...c, program: { items: [bad] } })).toEqual(['items']);
    const noTime = { ...c.program.items[0], time: '' };
    expect(validateCorporate('program', { ...c, program: { items: [noTime] } })).toEqual([]);
  });
  it('연사: 1~6명, 이름 필수', () => {
    const c = base();
    expect(validateCorporate('speakers', c)).toEqual(['items']);
    const s = { id: 's1', photo: null, name: '박서연', title: '', line: '' };
    expect(validateCorporate('speakers', { ...c, speakers: { items: [s] } })).toEqual([]);
  });
  it('참석 신청: 마감일은 비우거나 행사일 이전', () => {
    const c = base();
    expect(validateCorporate('rsvp', c)).toEqual([]);
    expect(validateCorporate('rsvp', { ...c, rsvp: { deadline: '2026-10-30' } })).toEqual([]);
    expect(validateCorporate('rsvp', { ...c, rsvp: { deadline: '2026-11-02' } })).toEqual(['deadline']);
  });
  it('문의처: 이름 필수, 전화나 메일 하나 이상, 형식 검사', () => {
    const c = base();
    const contact = (v: Partial<CorporateContent['contact']>) => ({ ...c, contact: { ...c.contact, name: '사무국', ...v } });
    expect(validateCorporate('contact', contact({}))).toEqual(['reach']);
    expect(validateCorporate('contact', contact({ phone: '02-123-4567' }))).toEqual([]);
    expect(validateCorporate('contact', contact({ phone: '01012345678' }))).toEqual([]);
    expect(validateCorporate('contact', contact({ phone: '123' }))).toEqual(['phone']);
    expect(validateCorporate('contact', contact({ email: 'event@wuzu' }))).toEqual(['email']);
    expect(validateCorporate('contact', contact({ email: 'event@wuzu.kr' }))).toEqual([]);
  });
  it('형식 함수와 초청인 줄', () => {
    expect(isPhone('010-1234-5678')).toBe(true);
    expect(isPhone('+82 10 1234 5678')).toBe(false);
    expect(isEmail('a@b.co')).toBe(true);
    expect(inviterLine({ ...base().basic, inviterTitle: '대표이사', inviterName: '김우주' })).toBe('대표이사 김우주');
    expect(inviterLine(base().basic)).toBe('');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/corporate.test.ts`
Expected: FAIL — `Cannot find module '../corporate'`.

- [ ] **Step 3: 구현**

```ts
// src/features/invitation/corporate.ts
/**
 * 기업 행사 초대장 — 기본값·검사·테마 정의
 * (설계: docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md 4장)
 */
import { currentLocale } from '../../i18n';
import { newItemId } from './editor/listOps';
import {
  CorporateBasic,
  CorporateContent,
  defaultContent,
  isDateString,
  LIMITS,
  PAGE_LABEL,
  PageKey,
  ProgramItem,
  SECTION_LABEL,
  SectionKey,
  validateSection,
} from './model';
import { registerTheme, ThemeDef } from './themes';

export const CORP_LIMITS = {
  eventName: 30,
  host: 20,
  inviterName: 10,
  inviterTitle: 15,
  audience: 50,
  dressCode: 20,
  program: 12,
  programTitle: 30,
  programDetail: 50,
  speakers: 6,
  speakerName: 10,
  speakerTitle: 20,
  speakerLine: 50,
  directions: 200,
  contactName: 10,
} as const;

const isEn = () => currentLocale() === 'en';

// 사용자가 고치는 기본 문구 — 만들 때 사용자 언어로 넣는다 (하객 화면에서 raw 로 그림)
const KO_GREETING =
  /* i18n-ignore */
  '귀한 걸음으로 자리를 빛내 주시면\n더없는 영광이겠습니다.\n\n바쁘시더라도 참석하시어\n함께해 주시기 바랍니다.';
const EN_GREETING = 'It would be our honor\nto have you join us.\n\nWe sincerely hope you can attend\nand share this occasion with us.';
const KO_ENDING = /* i18n-ignore */ '함께해 주셔서 감사합니다.';
const EN_ENDING = 'Thank you for joining us.';

export const defaultCorporateGreeting = () => (isEn() ? EN_GREETING : KO_GREETING);
export const defaultCorporateEnding = () => (isEn() ? EN_ENDING : KO_ENDING);

/** 드레스코드 칩 — 누르면 이 값이 입력칸에 들어간다 */
export const DRESS_CODES = () =>
  isEn()
    ? ['Casual', 'Business casual', 'Formal']
    : [/* i18n-ignore */ '자유 복장', /* i18n-ignore */ '비즈니스 캐주얼', /* i18n-ignore */ '정장'];

const programSeed = (): ProgramItem[] =>
  (isEn()
    ? [
        ['14:00', 'Registration'],
        ['14:30', 'Opening remarks'],
        ['15:00', 'Main session'],
      ]
    : [
        ['14:00', /* i18n-ignore */ '등록'],
        ['14:30', /* i18n-ignore */ '개회사'],
        ['15:00', /* i18n-ignore */ '본 행사'],
      ]
  ).map(([time, title]) => ({ id: newItemId(), time, title, detail: '' }));

export function defaultCorporateContent(today: Date = new Date()): CorporateContent {
  const w = defaultContent(today);
  return {
    theme: 'corporate',
    basic: { eventName: '', host: '', logo: null, inviterTitle: '', inviterName: '' },
    ceremony: { ...w.ceremony, time: '14:00', audience: '', dressCode: '' },
    greeting: { content: defaultCorporateGreeting(), photo: null, appendNames: true },
    program: { items: programSeed() },
    speakers: { items: [] },
    directions: { parking: '', transit: '' },
    rsvp: { deadline: '' },
    contact: { name: '', phone: '', email: '' },
    ending: { ...w.ending, content: defaultCorporateEnding() },
    bgm: w.bgm,
  };
}

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;

/** 국내 전화: 0으로 시작, 하이픈 있어도 없어도 (02-123-4567, 010-1234-5678, 01012345678) */
export const isPhone = (s: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(s.trim());
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** '대표이사 김우주' — 초청인을 안 넣었으면 '' */
export const inviterLine = (b: CorporateBasic) => [b.inviterTitle.trim(), b.inviterName.trim()].filter(Boolean).join(' ');

export function validateCorporate(key: SectionKey, c: CorporateContent): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);
  switch (key) {
    case 'basic': {
      const b = c.basic;
      check(filled(b.eventName) && within(b.eventName, CORP_LIMITS.eventName), 'eventName');
      check(filled(b.host) && within(b.host, CORP_LIMITS.host), 'host');
      check(
        filled(b.inviterName) === filled(b.inviterTitle) &&
          within(b.inviterName, CORP_LIMITS.inviterName) &&
          within(b.inviterTitle, CORP_LIMITS.inviterTitle),
        'inviter',
      );
      return errors;
    }
    case 'ceremony': {
      const base = validateSection('ceremony', { ...defaultContent(), ceremony: c.ceremony });
      check(within(c.ceremony.audience, CORP_LIMITS.audience), 'audience');
      check(within(c.ceremony.dressCode, CORP_LIMITS.dressCode), 'dressCode');
      return [...base, ...errors];
    }
    case 'program': {
      const items = c.program.items;
      check(
        items.length >= 1 &&
          items.length <= CORP_LIMITS.program &&
          items.every(
            (i) =>
              filled(i.title) &&
              within(i.title, CORP_LIMITS.programTitle) &&
              within(i.detail, CORP_LIMITS.programDetail) &&
              (i.time === '' || isTime(i.time)),
          ),
        'items',
      );
      return errors;
    }
    case 'speakers': {
      const items = c.speakers.items;
      check(
        items.length >= 1 &&
          items.length <= CORP_LIMITS.speakers &&
          items.every(
            (s) =>
              filled(s.name) &&
              within(s.name, CORP_LIMITS.speakerName) &&
              within(s.title, CORP_LIMITS.speakerTitle) &&
              within(s.line, CORP_LIMITS.speakerLine),
          ),
        'items',
      );
      return errors;
    }
    case 'directions':
      check(within(c.directions.parking, CORP_LIMITS.directions), 'parking');
      check(within(c.directions.transit, CORP_LIMITS.directions), 'transit');
      return errors;
    case 'rsvp': {
      const d = c.rsvp.deadline;
      check(d === '' || (isDateString(d) && d <= c.ceremony.date), 'deadline');
      return errors;
    }
    case 'contact': {
      const k = c.contact;
      check(filled(k.name) && within(k.name, CORP_LIMITS.contactName), 'name');
      if (!filled(k.phone) && !filled(k.email)) errors.push('reach');
      if (filled(k.phone)) check(isPhone(k.phone), 'phone');
      if (filled(k.email)) check(isEmail(k.email), 'email');
      return errors;
    }
    default:
      // 초청 인사·엔딩·BGM 은 결혼식과 같은 규칙
      return validateSection(key, {
        ...defaultContent(),
        ceremony: c.ceremony,
        greeting: c.greeting,
        ending: c.ending,
        bgm: c.bgm,
      });
  }
}

const CORP_SECTION_LABEL: Partial<Record<SectionKey, string>> = { ceremony: '행사 개요', greeting: '초청 인사' };
const CORP_PAGE_LABEL: Partial<Record<PageKey, string>> = { ceremony: '행사 개요', greeting: '초청 인사' };

export const corporateTheme: ThemeDef = {
  id: 'corporate',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '행사명, 주최, 초청인 정보를 입력합니다.' },
    { key: 'ceremony', title: '행사 개요', body: '행사 일시와 장소, 대상, 드레스코드를 입력합니다.' },
    { key: 'greeting', title: '초청 인사', body: '초대하는 분께 드릴 인사말을 입력합니다.' },
    { key: 'directions', title: '오시는 길', body: '주차와 대중교통 안내를 입력합니다.' },
  ],
  optional: [
    { key: 'program', title: '프로그램', body: '행사 시간표를 보여줍니다.' },
    { key: 'speakers', title: '연사 소개', body: '연사 사진과 소개를 보여줍니다.' },
    { key: 'rsvp', title: '참석 신청', body: '참석 신청을 받고 명단을 관리합니다.' },
    { key: 'contact', title: '문의처', body: '담당자 연락처를 안내합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: { program: true, speakers: false, rsvp: true, contact: true, ending: true, bgm: false },
  defaultOrder: ['ceremony', 'program', 'speakers', 'directions', 'rsvp', 'contact'],
  createContent: defaultCorporateContent,
  validate: (key, c) => validateCorporate(key, c as CorporateContent),
  sectionLabel: (k) => CORP_SECTION_LABEL[k] ?? SECTION_LABEL[k],
  pageLabel: (p) => CORP_PAGE_LABEL[p] ?? PAGE_LABEL[p],
};

registerTheme(corporateTheme);
```

`registerThemes.ts` 에 `import './corporate';` 한 줄 추가.

(참고: `LIMITS` import 가 쓰이지 않으면 지운다. `isDateString` 은 model.ts 에 이미 있다.)

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/features/invitation/__tests__/corporate.test.ts`
Expected: PASS. 실패하면 기대값이 아니라 구현을 고친다(단, '2026-11-01' 은 `defaultContent` 의 "오늘+7일" 규칙에서 온 값).

- [ ] **Step 5: 번역 누락 검사 맞추기**

Run: `npx jest src/i18n`
Expected: 새 화면 문구(테마 정의의 title·body, 라벨 '행사 개요'·'초청 인사'·'프로그램'·'연사 소개'·'오시는 길'·'참석 신청'·'문의처')가 사전에 없다고 FAIL. addEn 으로 넣는다:

```bash
node "<scratchpad>/addEn.js" '{"행사 개요":"Event overview","초청 인사":"Invitation message","프로그램":"Program","연사 소개":"Speakers","오시는 길":"Directions","참석 신청":"RSVP","문의처":"Contact","행사명, 주최, 초청인 정보를 입력합니다.":"Enter the event name, host and inviter.","행사 일시와 장소, 대상, 드레스코드를 입력합니다.":"Enter the date, venue, audience and dress code.","초대하는 분께 드릴 인사말을 입력합니다.":"Write a message for your guests.","주차와 대중교통 안내를 입력합니다.":"Enter parking and transit information.","행사 시간표를 보여줍니다.":"Shows the event schedule.","연사 사진과 소개를 보여줍니다.":"Shows speaker photos and bios.","참석 신청을 받고 명단을 관리합니다.":"Collects RSVPs and manages the guest list.","담당자 연락처를 안내합니다.":"Shows the contact person."}'
```

(이미 있는 키는 스크립트가 건너뛴다. 테스트가 더 가리키는 문구가 있으면 같은 방법으로 넣는다.)
다시 `npx jest` → 전부 PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 기업 행사 기본값·검사·테마 등록 (행사 개요·프로그램·연사·오시는 길·참석 신청·문의처)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 참석 응답 규칙 (순수 함수)

**Files:**
- Create: `src/features/rsvp/rsvp.ts`
- Test: `src/features/rsvp/__tests__/rsvp.test.ts`

**Interfaces:**
- Consumes: `isDateString`, `toDateString` (model.ts), `isPhone` (corporate.ts)
- Produces:
  - `type RsvpField = 'name' | 'org' | 'phone' | 'attending' | 'companions'`
  - `interface RsvpInput { name: string; attending: boolean; org: string; phone: string; companions: number }`
  - `interface RsvpResponse extends RsvpInput { id: string; invitationId: string; source: 'guest' | 'manual'; createdAt: string; updatedAt: string }`
  - `rsvpFields(themeId: string): RsvpField[]` — corporate: `['name','org','phone','attending']`, 그 밖: `['name','attending','companions']`
  - `emptyRsvpInput(): RsvpInput` — `{ name:'', attending: true, org:'', phone:'', companions: 0 }`
  - `RSVP_LIMITS = { name: 10, org: 20, companionsMax: 9 }`
  - `validateRsvp(input: RsvpInput, themeId: string): RsvpField[]` — 문제 있는 항목
  - `RSVP_MESSAGE: Record<RsvpField, string>` — 칸 아래 안내 문구
  - `isRsvpClosed(deadline: string, now: Date): boolean` — 마감일 다음 날 0시부터 닫힘
  - `rsvpTotals(list: RsvpResponse[]): { attending: number; people: number; declined: number }` — people = 참석 행 수 + 참석 행의 동반 인원

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/features/rsvp/__tests__/rsvp.test.ts
import {
  emptyRsvpInput,
  isRsvpClosed,
  RsvpResponse,
  rsvpFields,
  rsvpTotals,
  validateRsvp,
} from '../rsvp';

const row = (v: Partial<RsvpResponse>): RsvpResponse => ({
  ...emptyRsvpInput(),
  id: 'r',
  invitationId: 'i',
  source: 'guest',
  createdAt: '2026-10-25T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
  ...v,
});

describe('참석 응답 규칙', () => {
  it('테마별 받는 항목', () => {
    expect(rsvpFields('corporate')).toEqual(['name', 'org', 'phone', 'attending']);
    expect(rsvpFields('meetup')).toEqual(['name', 'attending', 'companions']);
  });
  it('기업: 이름·소속·연락처 필수, 연락처 형식', () => {
    expect(validateRsvp(emptyRsvpInput(), 'corporate')).toEqual(['name', 'org', 'phone']);
    const ok = { ...emptyRsvpInput(), name: '홍길동', org: '우주컴퍼니', phone: '010-1234-5678' };
    expect(validateRsvp(ok, 'corporate')).toEqual([]);
    expect(validateRsvp({ ...ok, phone: '1234' }, 'corporate')).toEqual(['phone']);
  });
  it('모임: 이름 필수, 동반 인원 0~9 (불참이면 동반 인원은 보지 않음)', () => {
    const ok = { ...emptyRsvpInput(), name: '김나미', companions: 2 };
    expect(validateRsvp(ok, 'meetup')).toEqual([]);
    expect(validateRsvp({ ...ok, companions: 10 }, 'meetup')).toEqual(['companions']);
    expect(validateRsvp({ ...ok, attending: false, companions: 10 }, 'meetup')).toEqual([]);
    expect(validateRsvp({ ...ok, name: ' ' }, 'meetup')).toEqual(['name']);
  });
  it('마감: 마감일 당일까지 받고 다음 날부터 닫힌다, 빈 마감일은 늘 열림', () => {
    expect(isRsvpClosed('', new Date(2030, 0, 1))).toBe(false);
    expect(isRsvpClosed('2026-10-30', new Date(2026, 9, 30, 23, 59))).toBe(false);
    expect(isRsvpClosed('2026-10-30', new Date(2026, 9, 31, 0, 0))).toBe(true);
  });
  it('합계: 참석 행·동반 인원 포함 인원·불참', () => {
    const list = [
      row({ id: 'a', attending: true, companions: 2 }),
      row({ id: 'b', attending: true, companions: 0 }),
      row({ id: 'c', attending: false, companions: 3 }),
    ];
    expect(rsvpTotals(list)).toEqual({ attending: 2, people: 4, declined: 1 });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/rsvp`
Expected: FAIL — `Cannot find module '../rsvp'`.

- [ ] **Step 3: 구현**

```ts
// src/features/rsvp/rsvp.ts
/**
 * 참석 응답 — 기업 행사(참석 신청)·모임(참석 여부)이 같이 쓴다 (설계 6장)
 * 받는 항목은 테마가 정하고 만든 사람이 끌 수 없다.
 */
import { isPhone } from '../invitation/corporate';
import { isDateString, toDateString } from '../invitation/model';

export type RsvpField = 'name' | 'org' | 'phone' | 'attending' | 'companions';

export interface RsvpInput {
  name: string;
  attending: boolean;
  /** 소속 (기업) */
  org: string;
  /** 연락처 (기업) */
  phone: string;
  /** 동반 인원 (모임) */
  companions: number;
}

export interface RsvpResponse extends RsvpInput {
  id: string;
  invitationId: string;
  /** 하객이 직접 / 만든 사람이 명단에 직접 넣음 */
  source: 'guest' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export const RSVP_LIMITS = { name: 10, org: 20, companionsMax: 9 } as const;

export const rsvpFields = (themeId: string): RsvpField[] =>
  themeId === 'corporate' ? ['name', 'org', 'phone', 'attending'] : ['name', 'attending', 'companions'];

export const emptyRsvpInput = (): RsvpInput => ({ name: '', attending: true, org: '', phone: '', companions: 0 });

export const RSVP_MESSAGE: Record<RsvpField, string> = {
  name: '이름을 입력해 주세요.',
  org: '소속을 입력해 주세요.',
  phone: '연락처를 확인해 주세요.',
  attending: '',
  companions: '동반 인원은 0~9명이에요.',
};

const filled = (s: string) => s.trim().length > 0;

export function validateRsvp(input: RsvpInput, themeId: string): RsvpField[] {
  const fields = rsvpFields(themeId);
  const bad: RsvpField[] = [];
  if (!filled(input.name) || input.name.trim().length > RSVP_LIMITS.name) bad.push('name');
  if (fields.includes('org') && (!filled(input.org) || input.org.trim().length > RSVP_LIMITS.org)) bad.push('org');
  if (fields.includes('phone') && !isPhone(input.phone)) bad.push('phone');
  if (
    fields.includes('companions') &&
    input.attending &&
    !(Number.isInteger(input.companions) && input.companions >= 0 && input.companions <= RSVP_LIMITS.companionsMax)
  )
    bad.push('companions');
  return bad;
}

/** 마감일 당일까지 받는다. 빈 마감일은 늘 열림 */
export const isRsvpClosed = (deadline: string, now: Date) => isDateString(deadline) && toDateString(now) > deadline;

export function rsvpTotals(list: RsvpResponse[]) {
  const yes = list.filter((r) => r.attending);
  return {
    attending: yes.length,
    people: yes.reduce((n, r) => n + 1 + (r.companions || 0), 0),
    declined: list.length - yes.length,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/features/rsvp`
Expected: PASS.

- [ ] **Step 5: 번역 + Commit**

```bash
node "<scratchpad>/addEn.js" '{"이름을 입력해 주세요.":"Please enter your name.","소속을 입력해 주세요.":"Please enter your organization.","연락처를 확인해 주세요.":"Please check your phone number.","동반 인원은 0~9명이에요.":"Guests must be between 0 and 9."}'
npx jest
git add -A
git commit -m "feat: 참석 응답 규칙 — 테마별 받는 항목, 검사, 마감, 합계

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 참석 응답 저장 (mock 서비스) · 기기에 내 응답 기억 · 새 응답 알림 분류

**Files:**
- Create: `src/services/mock/mockRsvpService.ts`
- Create: `src/features/rsvp/myRsvp.ts`
- Modify: `src/services/types.ts` (`RsvpService`, `AppNotification.category` 에 `'rsvp'`)
- Modify: `src/services/index.ts` (`rsvpService` 내보내기)
- Modify: `src/app/notifications.tsx` (rsvp 아이콘)
- Test: `src/services/__tests__/mockRsvpService.test.ts`, `src/features/rsvp/__tests__/myRsvp.test.ts`

**Interfaces:**
- Consumes: Task 3 의 `RsvpInput`, `RsvpResponse`, `validateRsvp`, `isRsvpClosed`; `KeyValueStorage`.
- Produces:
  - `types.ts`:
    ```ts
    export type RsvpSubmitResult = { ok: true; response: RsvpResponse; created: boolean } | { ok: false; reason: 'closed' | 'invalid' };
    export interface RsvpService {
      /** 최신순 */
      list(invitationId: string): Promise<RsvpResponse[]>;
      get(invitationId: string, id: string): Promise<RsvpResponse | null>;
      /** 하객 제출. id 가 있고 그 행이 있으면 고친다. 마감·검사는 여기서 막는다 */
      submit(args: { invitationId: string; themeId: string; deadline: string; input: RsvpInput; id?: string }): Promise<RsvpSubmitResult>;
      /** 만든 사람: 명단에 직접 넣기 (마감과 상관없음) */
      addManual(invitationId: string, themeId: string, input: RsvpInput): Promise<RsvpResponse>;
      /** 만든 사람: 고치기 (source 는 그대로) */
      update(invitationId: string, themeId: string, id: string, input: RsvpInput): Promise<RsvpResponse>;
      remove(invitationId: string, id: string): Promise<void>;
    }
    ```
    `AppNotification.category: 'notice' | 'purchase' | 'rsvp'`
  - `createMockRsvpService(opts: { delayMs: number; storage: KeyValueStorage; now?: () => Date }): RsvpService` — 저장 키 `RSVP_KEY = 'wuzu.mock.rsvp.v1'`
  - `createMyRsvp(storage: KeyValueStorage): { get(invitationId: string): Promise<string | null>; set(invitationId: string, responseId: string): Promise<void> }` — 키 `'wuzu.rsvp.mine.v1'`, `myRsvp = createMyRsvp(AsyncStorage)`
  - `services/index.ts`: `export const rsvpService = createMockRsvpService({ delayMs: 200, storage: AsyncStorage });`

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/services/__tests__/mockRsvpService.test.ts
import { emptyRsvpInput } from '../../features/rsvp/rsvp';
import { createMockRsvpService } from '../mock/mockRsvpService';
import type { KeyValueStorage } from '../types';

const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
};
const corp = { ...emptyRsvpInput(), name: '홍길동', org: '우주컴퍼니', phone: '010-1234-5678' };

describe('참석 응답 mock 서비스', () => {
  let now = new Date(2026, 9, 25, 10);
  const make = () => createMockRsvpService({ delayMs: 0, storage: memory(), now: () => now });
  beforeEach(() => (now = new Date(2026, 9, 25, 10)));

  it('하객 제출 → 명단에 생기고, 같은 id 로 다시 내면 그 행을 고친다', async () => {
    const s = make();
    const a = await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '', input: corp });
    expect(a.ok && a.created).toBe(true);
    const id = a.ok ? a.response.id : '';
    const b = await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '', input: { ...corp, attending: false }, id });
    expect(b.ok && b.created).toBe(false);
    const list = await s.list('i');
    expect(list).toHaveLength(1);
    expect(list[0].attending).toBe(false);
    expect(list[0].source).toBe('guest');
  });
  it('검사에 걸리면 invalid, 마감이 지나면 closed (고치기도 막힘)', async () => {
    const s = make();
    expect(await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '', input: emptyRsvpInput() })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    const a = await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '2026-10-30', input: corp });
    now = new Date(2026, 9, 31);
    const id = a.ok ? a.response.id : '';
    expect(
      await s.submit({ invitationId: 'i', themeId: 'corporate', deadline: '2026-10-30', input: corp, id }),
    ).toEqual({ ok: false, reason: 'closed' });
  });
  it('만든 사람: 직접 넣기·고치기·지우기, 다른 초대장 명단과 섞이지 않음', async () => {
    const s = make();
    const m = await s.addManual('i', 'corporate', corp);
    expect(m.source).toBe('manual');
    await s.update('i', 'corporate', m.id, { ...corp, name: '홍길순' });
    expect((await s.get('i', m.id))?.name).toBe('홍길순');
    expect((await s.get('i', m.id))?.source).toBe('manual');
    await s.addManual('j', 'corporate', corp);
    await s.remove('i', m.id);
    expect(await s.list('i')).toEqual([]);
    expect(await s.list('j')).toHaveLength(1);
  });
  it('만든 사람이 넣는 값도 검사한다', async () => {
    const s = make();
    await expect(s.addManual('i', 'corporate', emptyRsvpInput())).rejects.toThrow('INVALID');
  });
});
```

```ts
// src/features/rsvp/__tests__/myRsvp.test.ts
import type { KeyValueStorage } from '../../../services/types';
import { createMyRsvp } from '../myRsvp';

it('초대장마다 이 기기에서 낸 응답 id 를 기억한다', async () => {
  const m = new Map<string, string>();
  const storage: KeyValueStorage = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
  const mine = createMyRsvp(storage);
  expect(await mine.get('i')).toBeNull();
  await mine.set('i', 'r1');
  await mine.set('j', 'r2');
  expect(await mine.get('i')).toBe('r1');
  expect(await createMyRsvp(storage).get('j')).toBe('r2');
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/__tests__/mockRsvpService.test.ts src/features/rsvp/__tests__/myRsvp.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`types.ts` 에 `import type { RsvpInput, RsvpResponse } from '../features/rsvp/rsvp';` 와 Interfaces 의 `RsvpSubmitResult`·`RsvpService` 를 "알림" 블록 앞에 넣고, `category` 유니언에 `'rsvp'` 를 더한다.

```ts
// src/services/mock/mockRsvpService.ts
import { isRsvpClosed, RsvpInput, RsvpResponse, validateRsvp } from '../../features/rsvp/rsvp';
import type { KeyValueStorage, RsvpService } from '../types';

export const RSVP_KEY = 'wuzu.mock.rsvp.v1';

/** 참석 응답 — 초대장과 따로 저장한다 (서버가 생기면 같은 인터페이스로 바꾼다) */
export function createMockRsvpService(opts: { delayMs: number; storage: KeyValueStorage; now?: () => Date }): RsvpService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const load = async (): Promise<RsvpResponse[]> => JSON.parse((await storage.getItem(RSVP_KEY)) ?? '[]');
  const save = (rows: RsvpResponse[]) => storage.setItem(RSVP_KEY, JSON.stringify(rows));
  const clean = (input: RsvpInput): RsvpInput => ({
    name: input.name.trim(),
    attending: input.attending,
    org: input.org.trim(),
    phone: input.phone.trim(),
    companions: input.attending ? input.companions : 0,
  });
  const newRow = (invitationId: string, input: RsvpInput, source: RsvpResponse['source']): RsvpResponse => {
    const at = now().toISOString();
    return {
      ...clean(input),
      id: `r-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      invitationId,
      source,
      createdAt: at,
      updatedAt: at,
    };
  };

  return {
    async list(invitationId) {
      await wait();
      return (await load())
        .filter((r) => r.invitationId === invitationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(invitationId, id) {
      await wait();
      return (await load()).find((r) => r.invitationId === invitationId && r.id === id) ?? null;
    },
    async submit({ invitationId, themeId, deadline, input, id }) {
      await wait();
      if (isRsvpClosed(deadline, now())) return { ok: false, reason: 'closed' };
      if (validateRsvp(input, themeId).length) return { ok: false, reason: 'invalid' };
      const rows = await load();
      const idx = id ? rows.findIndex((r) => r.invitationId === invitationId && r.id === id) : -1;
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...clean(input), updatedAt: now().toISOString() };
        await save(rows);
        return { ok: true, response: rows[idx], created: false };
      }
      const row = newRow(invitationId, input, 'guest');
      await save([...rows, row]);
      return { ok: true, response: row, created: true };
    },
    async addManual(invitationId, themeId, input) {
      await wait();
      if (validateRsvp(input, themeId).length) throw new Error('INVALID');
      const row = newRow(invitationId, input, 'manual');
      await save([...(await load()), row]);
      return row;
    },
    async update(invitationId, themeId, id, input) {
      await wait();
      if (validateRsvp(input, themeId).length) throw new Error('INVALID');
      const rows = await load();
      const idx = rows.findIndex((r) => r.invitationId === invitationId && r.id === id);
      if (idx < 0) throw new Error('NOT_FOUND');
      rows[idx] = { ...rows[idx], ...clean(input), updatedAt: now().toISOString() };
      await save(rows);
      return rows[idx];
    },
    async remove(invitationId, id) {
      await wait();
      await save((await load()).filter((r) => !(r.invitationId === invitationId && r.id === id)));
    },
  };
}
```

```ts
// src/features/rsvp/myRsvp.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '../../services/types';

const KEY = 'wuzu.rsvp.mine.v1';

/** 이 기기에서 낸 참석 응답 id (초대장 id → 응답 id) — 다시 열면 낸 내용을 보여 주고 고칠 수 있게 */
export function createMyRsvp(storage: KeyValueStorage) {
  const load = async (): Promise<Record<string, string>> => JSON.parse((await storage.getItem(KEY)) ?? '{}');
  return {
    async get(invitationId: string) {
      return (await load())[invitationId] ?? null;
    },
    async set(invitationId: string, responseId: string) {
      await storage.setItem(KEY, JSON.stringify({ ...(await load()), [invitationId]: responseId }));
    },
  };
}

export const myRsvp = createMyRsvp(AsyncStorage);
```

`services/index.ts` 에 import 와 `export const rsvpService = createMockRsvpService({ delayMs: 200, storage: AsyncStorage });`.

`notifications.tsx` 아이콘 분기: `n.category === 'notice'` 다음에 `n.category === 'rsvp'` 면 `<Ionicons name="people-outline" size={26} color={colors.canvas} />`, 그 밖(구매)은 지금처럼 ₩.

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/services src/features/rsvp && npx tsc --noEmit`
Expected: PASS, 타입 오류 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 참석 응답 mock 서비스 — 하객 제출·고치기·마감, 만든 사람 직접 넣기, 기기에 내 응답 기억

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: 기업 템플릿 10종·색 · 표지 배치 · 정보 글자 · 로고 요소

**Files:**
- Modify: `src/data/templates.ts`
- Modify: `src/features/canvas/types.ts` (`BindKey` 에 `'eventName' | 'host'`, `PhotoElement.bind` 에 `'logo'`)
- Modify: `src/features/canvas/model.ts` (`BIND_LABEL`, `bindsFor`, `bindLabel`, `resolveBind`, `resolvePhoto`)
- Modify: `src/features/canvas/preset.ts` (`corporateCover`)
- Modify: `src/features/canvas/render/ElementView.tsx` (로고가 비면 아무것도 그리지 않음)
- Test: `src/data/__tests__/templates.test.ts`, `src/features/canvas/__tests__/corporateCover.test.ts`

**Interfaces:**
- Consumes: Task 1 `CorporateContent`, `isCorporate`, `isWedding`; Task 2 `defaultCorporateContent`.
- Produces:
  - `CORPORATE_PALETTES: Palette[]` (id: navy, charcoal, white, deepgreen, burgundy, gray, ocean, sand, blackgold, violet), `palettesFor('corporate')` 가 이것을 돌려준다.
  - `getTemplates('corporate')` 10종 모두 `font: 'sans'`.
  - `bindsFor('corporate') = ['eventName', 'host', 'date', 'weekday', 'datetime', 'time', 'venue']`
  - `resolvePhoto(c: InvitationContent, bind: 'coverPhoto' | 'logo' = 'coverPhoto'): string | null`
  - `coverPreset(style, 'corporate')` → 로고(photo, bind 'logo') + INVITATION + eventName + host + 줄 + datetime + venue

- [ ] **Step 1: 실패하는 테스트**

`templates.test.ts` 끝에:

```ts
describe('기업 템플릿', () => {
  it('10종 모두 고딕, 색 조합은 기업 10색', () => {
    const t = getTemplates('corporate');
    expect(t).toHaveLength(10);
    expect(t.every((x) => x.style.font === 'sans')).toBe(true);
    expect(palettesFor('corporate').map((p) => p.id)).toEqual([
      'navy', 'charcoal', 'white', 'deepgreen', 'burgundy', 'gray', 'ocean', 'sand', 'blackgold', 'violet',
    ]);
    expect(paletteOfTemplate('corporate', 'corporate-1')).toBe('navy');
    expect(styleFor('corporate', 'corporate-1', 'violet').bg).toBe(palettesFor('corporate')[9].bg);
  });
});
```

```ts
// src/features/canvas/__tests__/corporateCover.test.ts
import { getTemplates } from '../../../data/templates';
import { defaultCorporateContent } from '../../invitation/corporate';
import type { CorporateContent } from '../../invitation/model';
import { bindLabel, bindsFor, resolveBind, resolvePhoto } from '../model';
import { coverPreset } from '../preset';

const base = defaultCorporateContent(new Date(2026, 9, 25));
const c: CorporateContent = {
  ...base,
  basic: { ...base.basic, eventName: '파트너스 데이', host: '우주컴퍼니' },
  ceremony: { ...base.ceremony, venue: '그랜드홀' },
};

describe('기업 표지', () => {
  it('배치: 로고 요소 + 행사명·주최·일시·장소', () => {
    const doc = coverPreset(getTemplates('corporate')[0].style, 'corporate');
    const logo = doc.elements.find((e) => e.kind === 'photo');
    expect(logo && logo.kind === 'photo' && logo.bind).toBe('logo');
    const binds = doc.elements.flatMap((e) => (e.kind === 'bound' ? [e.bind] : []));
    expect(binds).toEqual(['eventName', 'host', 'datetime', 'venue']);
  });
  it('정보 글자 값과 빈 칸 안내', () => {
    expect(resolveBind('eventName', c)).toEqual({ text: '파트너스 데이', placeholder: false });
    expect(resolveBind('host', c)).toEqual({ text: '우주컴퍼니', placeholder: false });
    expect(resolveBind('eventName', base)).toEqual({ text: '행사명', placeholder: true });
    expect(resolveBind('venue', base)).toEqual({ text: '장소', placeholder: true });
  });
  it('정보 글자 목록·이름', () => {
    expect(bindsFor('corporate')).toEqual(['eventName', 'host', 'date', 'weekday', 'datetime', 'time', 'venue']);
    expect(bindLabel('venue', 'corporate')).toBe('장소명');
    expect(bindLabel('eventName', 'corporate')).toBe('행사명');
  });
  it('로고: 넣었으면 주소, 안 넣었으면 null (빈 틀을 그리지 않는다)', () => {
    expect(resolvePhoto(base, 'logo')).toBeNull();
    expect(resolvePhoto({ ...c, basic: { ...c.basic, logo: 'logo.png' } }, 'logo')).toBe('logo.png');
    expect(resolvePhoto(c, 'coverPhoto')).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data src/features/canvas`
Expected: FAIL — 기업 템플릿이 결혼식 STYLES(serif 섞임), `resolveBind('eventName')` 빈 값 등.

- [ ] **Step 3: 템플릿·색 (`templates.ts`)**

`DOL_PALETTES` 아래에:

```ts
/** 기업 행사 전용 10종 — 차분한 색·고딕 (설계 4장) */
const CORPORATE_STYLES: { name: string; style: TemplateStyle }[] = [
  { name: '네이비', style: { bg: '#14213D', fg: '#F5F5F0', sub: '#A9B3C7', accent: '#E0B74F', font: 'sans', cover: 'date' } },
  { name: '차콜', style: { bg: '#2B2D31', fg: '#F2F2F2', sub: '#A0A3A8', accent: '#E07A3F', font: 'sans', cover: 'frame' } },
  { name: '화이트 미니멀', style: { bg: '#FFFFFF', fg: '#111827', sub: '#6B7280', accent: '#1D4ED8', font: 'sans', cover: 'date' } },
  { name: '딥그린', style: { bg: '#0F3B2E', fg: '#F1EFE7', sub: '#A7BDB3', accent: '#C9A75B', font: 'sans', cover: 'frame' } },
  { name: '버건디', style: { bg: '#5B1A2A', fg: '#F7EDEE', sub: '#CFA9B1', accent: '#E6C07B', font: 'sans', cover: 'date' } },
  { name: '그레이', style: { bg: '#EEF0F3', fg: '#1F2933', sub: '#6B7684', accent: '#3B5BDB', font: 'sans', cover: 'frame' } },
  { name: '오션', style: { bg: '#E8F1F8', fg: '#0B2A44', sub: '#5A7488', accent: '#0F6FB8', font: 'sans', cover: 'date' } },
  { name: '샌드', style: { bg: '#F5F0E6', fg: '#2E2A24', sub: '#7C7364', accent: '#8A6D3B', font: 'sans', cover: 'frame' } },
  { name: '블랙 골드', style: { bg: '#0B0B0C', fg: '#F4F1EA', sub: '#9C978C', accent: '#C8A24A', font: 'sans', cover: 'date' } },
  { name: '바이올렛', style: { bg: '#F1EFFB', fg: '#241F45', sub: '#6E6893', accent: '#5B4BC4', font: 'sans', cover: 'frame' } },
];
const CORPORATE_PALETTE_IDS = ['navy', 'charcoal', 'white', 'deepgreen', 'burgundy', 'gray', 'ocean', 'sand', 'blackgold', 'violet'];
/** 기업 [색상] 칩의 10색 */
export const CORPORATE_PALETTES: Palette[] = CORPORATE_STYLES.map(({ name, style }, i) => ({
  id: CORPORATE_PALETTE_IDS[i],
  name,
  bg: style.bg,
  fg: style.fg,
  sub: style.sub,
  accent: style.accent,
}));
```

`palettesFor` 와 `TEMPLATES` 를 테마 표로 바꾼다:

```ts
const THEME_STYLES: Partial<Record<ThemeId, { name: string; style: TemplateStyle }[]>> = {
  dol: DOL_STYLES,
  corporate: CORPORATE_STYLES,
};
const THEME_PALETTES: Partial<Record<ThemeId, Palette[]>> = { dol: DOL_PALETTES, corporate: CORPORATE_PALETTES };
/** 테마별 색 조합 */
export const palettesFor = (themeId: string): Palette[] => THEME_PALETTES[themeId as ThemeId] ?? PALETTES;
```

`TEMPLATES` 안의 `(themeId === 'dol' ? DOL_STYLES : STYLES)` → `(THEME_STYLES[themeId] ?? STYLES)`.
색 이름은 addEn 으로: `{"네이비":"Navy","차콜":"Charcoal","화이트 미니멀":"Minimal White","딥그린":"Deep Green","버건디":"Burgundy","그레이":"Gray","오션":"Ocean","샌드":"Sand","블랙 골드":"Black Gold","바이올렛":"Violet"}`.

- [ ] **Step 4: 정보 글자·로고 (`types.ts`, `canvas/model.ts`, `ElementView.tsx`)**

`types.ts`: `BindKey` 끝에 `// 기업 행사` 주석과 `| 'eventName' | 'host'`. `PhotoElement` 의 `bind: 'coverPhoto'` → `bind: 'coverPhoto' | 'logo'`.

`canvas/model.ts`:

```ts
// BIND_LABEL 에
  eventName: '행사명',
  host: '주최',

const CORPORATE_BINDS: BindKey[] = ['eventName', 'host', 'date', 'weekday', 'datetime', 'time', 'venue'];
/** 결혼식이 아닌 테마는 날짜·장소 이름에 '예식'을 쓰지 않는다 */
const EVENT_BIND_LABEL: Partial<Record<BindKey, string>> = { date: '날짜', datetime: '일시', time: '시간', venue: '장소명' };
export const bindLabel = (bind: BindKey, themeId: string) =>
  (themeId === 'wedding' ? undefined : EVENT_BIND_LABEL[bind]) ?? BIND_LABEL[bind];

export const bindsFor = (themeId: string): BindKey[] =>
  themeId === 'dol' ? DOL_BINDS : themeId === 'corporate' ? CORPORATE_BINDS : WEDDING_BINDS;
```

(`DOL_BIND_LABEL` 은 `EVENT_BIND_LABEL` 로 이름을 바꿔 같이 쓴다.)

`resolveBind` 의 venue 빈 칸: `isDol(c) ? '장소' : '예식장'` → `isWedding(c) ? '예식장' : '장소'`. 돌잔치 분기 앞에:

```ts
  if (isCorporate(c)) {
    const b = c.basic;
    switch (bind) {
      case 'eventName':
        return b.eventName.trim() ? { text: b.eventName.trim(), placeholder: false } : { text: '행사명', placeholder: true };
      case 'host':
        return b.host.trim() ? { text: b.host.trim(), placeholder: false } : { text: '주최', placeholder: true };
      default:
        return { text: '', placeholder: true };
    }
  }
```

`resolvePhoto`:

```ts
/** 사진 요소의 사진 — 돌잔치 표지 사진 / 기업 로고. 없으면 null */
export function resolvePhoto(c: InvitationContent, bind: 'coverPhoto' | 'logo' = 'coverPhoto'): string | null {
  if (bind === 'logo') return isCorporate(c) ? c.basic.logo : null;
  return isDol(c) ? c.basic.photo : null;
}
```

`ElementView.tsx` 사진 분기: `const uri = resolvePhoto(content, el.bind);` 로 바꾸고, `!uri && el.bind === 'logo'` 이면 `node = null`(로고는 선택 — 빈 틀 대신 아무것도 그리지 않음). 나머지는 지금처럼.

- [ ] **Step 5: 기업 표지 배치 (`preset.ts`)**

결혼식 `frame` 테두리 상자 만드는 코드(`preset-frame`)를 `function frameBox(style: TemplateStyle): CanvasElement` 로 뺀다(값 그대로). `if (themeId === 'dol') return dolCover(style, text, bound);` 아래에 `if (themeId === 'corporate') return corporateCover(style, text, bound, rule);`, 파일 아래에:

```ts
type RuleMaker = (id: string, y: number, lengthPx: number) => CanvasElement;

/** 기업 표지: 로고(있을 때만) · INVITATION · 행사명 · 주최 · 줄 · 일시 · 장소. frame 템플릿은 테두리 */
function corporateCover(style: TemplateStyle, text: Maker, bound: BoundMaker, rule: RuleMaker): CanvasDoc {
  const elements: CanvasElement[] = [
    { id: 'preset-logo', kind: 'photo', bind: 'logo', x: 0.5, y: 0.27, w: 0.2, rotation: 0, aspect: 1, frame: 'rounded' },
    text('preset-label', 'INVITATION', 0.37, 12, style.accent),
    bound('preset-event', 'eventName', 0.44, 26, style.fg, true),
    bound('preset-host', 'host', 0.505, 15, style.sub),
    rule('preset-rule', 0.55, 32),
    bound('preset-datetime', 'datetime', 0.6, 14, style.sub),
    bound('preset-venue', 'venue', 0.645, 14, style.sub),
  ];
  if (style.cover === 'frame') elements.unshift(frameBox(style));
  return { background: { kind: 'template' }, elements };
}
```

(`Maker`·`BoundMaker` 는 dolCover 가 쓰는 타입 그대로.)

- [ ] **Step 6: 통과 확인**

Run: `npx jest && npx tsc --noEmit`
Expected: 전부 PASS (돌잔치 `bindLabel` 테스트도 그대로), 타입 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 기업 템플릿 10종·색, 표지 배치(로고·행사명·주최), 정보 글자 행사명·주최

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 기업 입력 폼과 입력 시트 연결

**Files:**
- Modify: `src/features/invitation/editor/fields.tsx` (`PhotoOne`, `DateField` 를 DolForms 에서 옮겨 와 내보냄)
- Modify: `src/features/invitation/editor/DolForms.tsx` (옮긴 부품 import 로)
- Create: `src/features/invitation/editor/CorporateForms.tsx`
- Modify: `src/features/invitation/editor/SectionSheet.tsx`, `TextForms.tsx`, `CeremonyForm.tsx`(문구)
- Test: `src/features/invitation/__tests__/corporateForms.test.tsx`

**Interfaces:**
- Consumes: Task 2 `CORP_LIMITS`, `DRESS_CODES`, `isPhone`, `isEmail`; `ListEditor`(☰ 끌기, `onDragChange`), `addItem`, `updateItem`, `newItemId`; `TimePickerModal`; `useEditor().patch`.
- Produces:
  - `fields.tsx`: `export function PhotoOne(props: { label: string; uri: string | null; onChange: (uri: string | null) => void; required?: boolean })`, `export function DateField(props: { label: string; value: string; onChange: (d: string) => void; required?: boolean; range: DateRange; error?: string; start?: string; clearable?: boolean })` — `start` 는 값이 없을 때 달력을 여는 날(기본: 오늘), `clearable` 이면 [지우기] 로 '' 를 넣는다.
  - `CorporateForms.tsx`: `CorporateBasicForm`, `CorporateOverviewFields`, `ProgramForm({ onDragChange })`, `SpeakersForm({ onDragChange })`, `DirectionsForm`, `RsvpSettingsForm`, `ContactForm`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/features/invitation/__tests__/corporateForms.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useEditor } from '../editorStore';
import { ContactForm, CorporateBasicForm, CorporateOverviewFields, ProgramForm } from '../editor/CorporateForms';
import type { CorporateContent } from '../model';

const content = () => useEditor.getState().draft!.content as CorporateContent;

describe('기업 입력 폼', () => {
  beforeEach(() =>
    useEditor
      .getState()
      .start({ ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today: new Date(2026, 9, 25) }),
  );
  it('기본 정보: 행사명·주최를 넣으면 스토어에 들어간다', () => {
    render(<CorporateBasicForm />);
    fireEvent.changeText(screen.getByPlaceholderText('예) 2026 파트너스 데이'), '파트너스 데이');
    fireEvent.changeText(screen.getByPlaceholderText('회사·단체 이름'), '우주컴퍼니');
    expect(content().basic.eventName).toBe('파트너스 데이');
    expect(content().basic.host).toBe('우주컴퍼니');
  });
  it('행사 개요: 드레스코드 칩을 누르면 그 값이 들어간다', () => {
    render(<CorporateOverviewFields />);
    fireEvent.press(screen.getByText('비즈니스 캐주얼'));
    expect(content().ceremony.dressCode).toBe('비즈니스 캐주얼');
  });
  it('프로그램: [+ 순서 추가] 로 항목이 는다', () => {
    render(<ProgramForm />);
    fireEvent.press(screen.getByText('순서 추가'));
    expect(content().program.items).toHaveLength(4);
  });
  it('문의처: 잘못된 메일이면 칸 아래 안내', () => {
    render(<ContactForm />);
    fireEvent.changeText(screen.getByPlaceholderText('event@company.com'), 'event@wuzu');
    expect(screen.getByText('이메일 형식을 확인해 주세요.')).toBeTruthy();
  });
});
```

(화면 테스트가 처음이면 `@testing-library/react-native` 가 있는지 `package.json` 에서 확인한다 — `src/components/__tests__/Txt.test.tsx` 가 쓰고 있으면 있다. `TextField` 가 placeholder 를 번역해 그릴 수 있으니 jest 는 한국어(jest.setup 이 'ko' 로 맞춤)라 그대로 찾힌다.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/corporateForms.test.tsx`
Expected: FAIL — `Cannot find module '../editor/CorporateForms'`.

- [ ] **Step 3: `PhotoOne`·`DateField` 옮기기**

`DolForms.tsx` 의 `PhotoOne`·`DateField` 와 그 둘이 쓰는 스타일(`group`, `photo`, `add`, `addRequired`, `remove`, `dateBox`)을 `fields.tsx` 로 옮겨 `export` 한다. `DateField` 에 두 속성을 더한다:

```tsx
        // 값이 없을 때 달력이 열리는 날 (돌잔치 태어난 날은 1년쯤 전)
        value={value || start || toDateString(new Date())}
```

```tsx
      {clearable && !!value && (
        <Pressable onPress={() => onChange('')} hitSlop={6} accessibilityRole="button">
          <Txt variant="tiny" color={colors.infoInk}>
            지우기
          </Txt>
        </Pressable>
      )}
```

`DolForms.tsx` 의 태어난 날 칸에 `start={addDays(toDateString(new Date()), -300)}` 를 넘긴다(전에 고정이던 '2025-06-01' 대신 — 미룬 항목 하나가 같이 풀린다).
Run: `npx jest` → 기존 테스트 그대로 PASS.

- [ ] **Step 4: `CorporateForms.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { CORP_LIMITS, DRESS_CODES, isEmail, isPhone } from '../corporate';
import { useEditor } from '../editorStore';
import { CorporateContent, ProgramItem, Speaker } from '../model';
import { DateField, FormLabel, Hint, PhotoOne } from './fields';
import { ListEditor } from './ListEditor';
import { addItem, newItemId, updateItem } from './listOps';
import { TimePickerModal } from './Pickers';

/** 기업 행사 입력 시트 (설계 4장) */

const useCorp = () => useEditor((s) => s.draft!.content as CorporateContent);
const usePatch = () => useEditor((s) => s.patch);
type DragProps = { onDragChange?: (dragging: boolean) => void };

/** 기본 정보: 행사명·주최(필수), 로고(선택), 초청인 직함·이름(둘 다 또는 둘 다 비움) */
export function CorporateBasicForm() {
  const b = useCorp().basic;
  const patch = usePatch();
  const set = (v: Partial<typeof b>) => patch('basic', v);
  const inviterHalf = !!b.inviterName.trim() !== !!b.inviterTitle.trim();
  return (
    <View style={styles.form}>
      <TextField
        label="행사명"
        required
        value={b.eventName}
        onChangeText={(eventName) => set({ eventName })}
        maxLength={CORP_LIMITS.eventName}
        invalid={!b.eventName.trim()}
        placeholder="예) 2026 파트너스 데이"
      />
      <TextField
        label="주최"
        required
        value={b.host}
        onChangeText={(host) => set({ host })}
        maxLength={CORP_LIMITS.host}
        invalid={!b.host.trim()}
        placeholder="회사·단체 이름"
      />
      <PhotoOne label="로고" uri={b.logo} onChange={(logo) => set({ logo })} />
      <View style={styles.group}>
        <FormLabel>초청인</FormLabel>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="직함"
              value={b.inviterTitle}
              onChangeText={(inviterTitle) => set({ inviterTitle })}
              maxLength={CORP_LIMITS.inviterTitle}
              invalid={inviterHalf && !b.inviterTitle.trim()}
              placeholder="예) 대표이사"
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="이름"
              value={b.inviterName}
              onChangeText={(inviterName) => set({ inviterName })}
              maxLength={CORP_LIMITS.inviterName}
              invalid={inviterHalf && !b.inviterName.trim()}
            />
          </View>
        </View>
        {inviterHalf && <Hint>직함과 이름을 함께 넣어 주세요.</Hint>}
      </View>
    </View>
  );
}

/** 행사 개요 시트 아래쪽: 대상·드레스코드 (일시·장소는 위의 공통 CeremonyForm) */
export function CorporateOverviewFields() {
  const e = useCorp().ceremony;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextField
        label="대상"
        value={e.audience}
        onChangeText={(audience) => patch('ceremony', { audience })}
        maxLength={CORP_LIMITS.audience}
        placeholder="예) 파트너사 임직원"
      />
      <View style={styles.group}>
        <TextField
          label="드레스코드"
          value={e.dressCode}
          onChangeText={(dressCode) => patch('ceremony', { dressCode })}
          maxLength={CORP_LIMITS.dressCode}
        />
        <View style={styles.chips}>
          {DRESS_CODES().map((d) => (
            <Pressable
              key={d}
              onPress={() => patch('ceremony', { dressCode: d })}
              style={[styles.chip, e.dressCode === d && styles.chipOn]}
              accessibilityRole="button"
            >
              <Txt variant="caption" color={e.dressCode === d ? colors.brand : colors.label}>
                {d}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/** 프로그램: 시간(선택)·제목(필수)·담당/설명, 최대 12개, ☰ 끌어 순서 */
export function ProgramForm({ onDragChange }: DragProps) {
  const items = useCorp().program.items;
  const patch = usePatch();
  const set = (next: ProgramItem[]) => patch('program', { items: next });
  const [timeFor, setTimeFor] = useState<string | null>(null);
  const editing = items.find((i) => i.id === timeFor);
  return (
    <View style={styles.form}>
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={CORP_LIMITS.program}
        addLabel="순서 추가"
        onAdd={() => set(addItem(items, { id: newItemId(), time: '', title: '', detail: '' }, CORP_LIMITS.program))}
        onChange={set}
        renderItem={(it) => (
          <View style={styles.form}>
            <View style={styles.group}>
              <FormLabel>시간</FormLabel>
              <Pressable
                onPress={() => setTimeFor(it.id)}
                style={styles.box}
                accessibilityRole="button"
                accessibilityLabel="시간 선택"
              >
                <Txt color={it.time ? colors.text : colors.placeholder}>{it.time || '시간 선택'}</Txt>
                <Ionicons name="time-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <TextField
              label="제목"
              required
              value={it.title}
              onChangeText={(title) => set(updateItem(items, it.id, { title }))}
              maxLength={CORP_LIMITS.programTitle}
              invalid={!it.title.trim()}
            />
            <TextField
              label="담당·설명"
              value={it.detail}
              onChangeText={(detail) => set(updateItem(items, it.id, { detail }))}
              maxLength={CORP_LIMITS.programDetail}
            />
          </View>
        )}
      />
      <TimePickerModal
        visible={!!editing}
        value={editing?.time || '14:00'}
        onClose={() => setTimeFor(null)}
        onSelect={(time) => {
          if (editing) set(updateItem(items, editing.id, { time }));
          setTimeFor(null);
        }}
      />
    </View>
  );
}

/** 연사 소개: 사진·이름(필수)·직함·한 줄, 최대 6명 */
export function SpeakersForm({ onDragChange }: DragProps) {
  const items = useCorp().speakers.items;
  const patch = usePatch();
  const set = (next: Speaker[]) => patch('speakers', { items: next });
  const edit = (id: string, v: Partial<Speaker>) => set(updateItem(items, id, v));
  return (
    <View style={styles.form}>
      {!items.length && <Hint>연사를 한 명 이상 넣어 주세요.</Hint>}
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={CORP_LIMITS.speakers}
        addLabel="연사 추가"
        onAdd={() =>
          set(addItem(items, { id: newItemId(), photo: null, name: '', title: '', line: '' }, CORP_LIMITS.speakers))
        }
        onChange={set}
        renderItem={(s) => (
          <View style={styles.form}>
            <PhotoOne label="사진" uri={s.photo} onChange={(photo) => edit(s.id, { photo })} />
            <TextField
              label="이름"
              required
              value={s.name}
              onChangeText={(name) => edit(s.id, { name })}
              maxLength={CORP_LIMITS.speakerName}
              invalid={!s.name.trim()}
            />
            <TextField
              label="직함"
              value={s.title}
              onChangeText={(title) => edit(s.id, { title })}
              maxLength={CORP_LIMITS.speakerTitle}
            />
            <TextField
              label="한 줄 소개"
              value={s.line}
              onChangeText={(line) => edit(s.id, { line })}
              maxLength={CORP_LIMITS.speakerLine}
            />
          </View>
        )}
      />
    </View>
  );
}

/** 오시는 길: 주소·지도는 행사 개요에서, 여기서는 주차·대중교통 안내 */
export function DirectionsForm() {
  const d = useCorp().directions;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <Hint>주소와 지도는 행사 개요에서 넣어요.</Hint>
      <TextArea
        label="주차 안내"
        value={d.parking}
        onChangeText={(parking) => patch('directions', { parking })}
        maxLength={CORP_LIMITS.directions}
        minHeight={72}
        placeholder="예) 건물 지하 2~4층, 3시간 무료"
      />
      <TextArea
        label="대중교통"
        value={d.transit}
        onChangeText={(transit) => patch('directions', { transit })}
        maxLength={CORP_LIMITS.directions}
        minHeight={72}
        placeholder="예) 2호선 삼성역 5번 출구 도보 5분"
      />
    </View>
  );
}

/** 참석 신청: 마감일(선택). 받는 항목은 정해져 있다 */
export function RsvpSettingsForm() {
  const c = useCorp();
  const patch = usePatch();
  const late = !!c.rsvp.deadline && c.rsvp.deadline > c.ceremony.date;
  return (
    <View style={styles.form}>
      <DateField
        label="마감일"
        range="future"
        value={c.rsvp.deadline}
        clearable
        start={c.ceremony.date}
        onChange={(deadline) => patch('rsvp', { deadline })}
        error={late ? '마감일은 행사일 전이어야 해요.' : undefined}
      />
      <Hint>비워 두면 행사 당일까지 받아요.</Hint>
      <View style={styles.group}>
        <FormLabel>받는 항목</FormLabel>
        <Txt variant="caption" color={colors.muted}>
          이름 · 소속 · 연락처 · 참석 여부
        </Txt>
      </View>
      <Hint>받은 응답은 나의 초대장의 [참석 응답]에서 보고, 전화로 받은 응답도 직접 넣을 수 있어요.</Hint>
    </View>
  );
}

/** 문의처: 담당자(필수) + 전화나 메일 하나 이상 */
export function ContactForm() {
  const k = useCorp().contact;
  const patch = usePatch();
  const set = (v: Partial<typeof k>) => patch('contact', v);
  const badPhone = !!k.phone.trim() && !isPhone(k.phone);
  const badEmail = !!k.email.trim() && !isEmail(k.email);
  return (
    <View style={styles.form}>
      <TextField
        label="담당자"
        required
        value={k.name}
        onChangeText={(name) => set({ name })}
        maxLength={CORP_LIMITS.contactName}
        invalid={!k.name.trim()}
        placeholder="예) 행사 사무국"
      />
      <TextField
        label="전화"
        value={k.phone}
        onChangeText={(phone) => set({ phone })}
        keyboardType="phone-pad"
        placeholder="02-123-4567"
        invalid={badPhone}
        message={badPhone ? '전화번호 형식을 확인해 주세요.' : undefined}
      />
      <TextField
        label="이메일"
        value={k.email}
        onChangeText={(email) => set({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="event@company.com"
        invalid={badEmail}
        message={badEmail ? '이메일 형식을 확인해 주세요.' : undefined}
      />
      {!k.phone.trim() && !k.email.trim() && <Hint>전화나 이메일 중 하나는 넣어 주세요.</Hint>}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipOn: { borderColor: colors.brand },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
```

(드레스코드 칩 글자는 사용자 언어로 이미 만들어진 값이라 사전에 없어도 원문 그대로 보인다 — 한국어 값 3개는 번역 누락 검사가 잡으면 `/* i18n-ignore */` 가 붙은 corporate.ts 에서 오므로 대상이 아니다. `TextField` 의 `message`·`placeholder`·`keyboardType`·`autoCapitalize` 이름이 Props 와 다르면 그 이름으로 맞추고 Ruling.)

- [ ] **Step 5: 입력 시트·인사말 체크·일시 장소 문구**

`SectionSheet.tsx`:

```tsx
  const dol = draft.themeId === 'dol';
  const corp = draft.themeId === 'corporate';
```

```tsx
        {section === 'basic' &&
          (dol ? <DolBasicForm onDragChange={setDragging} /> : corp ? <CorporateBasicForm /> : <BasicForm />)}
        {section === 'ceremony' && <CeremonyForm onDragChange={setDragging} />}
        {section === 'ceremony' && corp && <CorporateOverviewFields />}
        {section === 'program' && <ProgramForm onDragChange={setDragging} />}
        {section === 'speakers' && <SpeakersForm onDragChange={setDragging} />}
        {section === 'directions' && <DirectionsForm />}
        {section === 'rsvp' && <RsvpSettingsForm />}
        {section === 'contact' && <ContactForm />}
```

(기존 `ceremony` 줄은 하나만 남긴다.) `TextForms.tsx` 인사말 체크:

```tsx
  const themeId = useEditor((s) => s.draft!.themeId);
  ...
          label={themeId === 'dol' ? '보호자 이름 삽입' : themeId === 'corporate' ? '초청인 서명 넣기' : '신랑, 신부 이름 삽입'}
```

(위 `const dol = ...` 줄은 `themeId` 로 바꾼다.) `CeremonyForm.tsx` 에 '예식장'·'예식' 이 들어간 라벨·안내가 있으면 결혼식이 아닐 때 '장소'·'행사' 로 보이게 한다(`useEditor((s) => s.draft!.themeId)` 로 고른다. 돌잔치가 이미 바꿔 쓰는 방식이 있으면 그대로 따른다).

- [ ] **Step 6: 번역·검사**

```bash
node "<scratchpad>/addEn.js" '{"행사명":"Event name","주최":"Host","로고":"Logo","초청인":"Inviter","직함":"Title","예) 2026 파트너스 데이":"e.g. 2026 Partners Day","회사·단체 이름":"Company or organization","예) 대표이사":"e.g. CEO","직함과 이름을 함께 넣어 주세요.":"Please enter both a title and a name.","대상":"Audience","예) 파트너사 임직원":"e.g. Partner company staff","드레스코드":"Dress code","순서 추가":"Add item","시간":"Time","시간 선택":"Select time","담당·설명":"Speaker / details","연사를 한 명 이상 넣어 주세요.":"Please add at least one speaker.","연사 추가":"Add speaker","한 줄 소개":"One-line bio","주소와 지도는 행사 개요에서 넣어요.":"Add the address and map in Event overview.","주차 안내":"Parking","대중교통":"Public transit","예) 건물 지하 2~4층, 3시간 무료":"e.g. B2–B4, free for 3 hours","예) 2호선 삼성역 5번 출구 도보 5분":"e.g. 5 min walk from Samseong Station exit 5","마감일":"Deadline","마감일은 행사일 전이어야 해요.":"The deadline must be before the event.","비워 두면 행사 당일까지 받아요.":"Leave blank to accept until the event day.","받는 항목":"Questions","이름 · 소속 · 연락처 · 참석 여부":"Name · Organization · Phone · Attendance","받은 응답은 나의 초대장의 [참석 응답]에서 보고, 전화로 받은 응답도 직접 넣을 수 있어요.":"See responses under [RSVPs] in My invitations. You can also add responses you received by phone.","담당자":"Contact person","예) 행사 사무국":"e.g. Event office","전화":"Phone","이메일":"Email","전화번호 형식을 확인해 주세요.":"Please check the phone number.","이메일 형식을 확인해 주세요.":"Please check the email address.","전화나 이메일 중 하나는 넣어 주세요.":"Please enter a phone number or an email.","초청인 서명 넣기":"Add inviter signature","지우기":"Clear"}'
npx jest && npx tsc --noEmit && npx expo lint
```

Expected: jest 전부 PASS, tsc 0, lint 21 errors / 7 warnings 이하.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 기업 입력 폼 — 기본 정보·행사 개요(대상·드레스코드)·프로그램·연사·오시는 길·참석 신청·문의처

- 사진 한 장 칸·날짜 칸을 공통 부품으로 옮김 (돌잔치 태어난 날 달력 시작일 고정도 풀림)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: 기업 하객 화면 장 · 참석 신청(하객)

**Files:**
- Create: `src/features/invitation/view/CorporatePages.tsx`
- Create: `src/features/invitation/view/RsvpPage.tsx`
- Create: `src/features/rsvp/RsvpFormModal.tsx`
- Modify: `src/features/invitation/view/CeremonyPage.tsx` (`showMap`, `children`, `MapCard` export)
- Modify: `src/features/invitation/view/PageContent.tsx` (기업 분기, `RsvpHandlers`)
- Modify: `src/features/invitation/view/GreetingPage.tsx` (기업 서명)
- Modify: `src/app/invite/[id].tsx` (참석 신청 연결·알림)
- Test: `src/features/invitation/__tests__/corporatePages.test.tsx`

**Interfaces:**
- Consumes: Task 3·4 (`RsvpInput`, `RsvpResponse`, `emptyRsvpInput`, `rsvpFields`, `validateRsvp`, `RSVP_MESSAGE`, `RSVP_LIMITS`, `isRsvpClosed`, `rsvpService`, `myRsvp`), Task 2 `inviterLine`, `notificationService.add`.
- Produces:
  - `PageContent.tsx`:
    ```ts
    export interface RsvpHandlers {
      /** 이 기기에서 낸 응답 (없으면 null) */
      mine: RsvpResponse | null;
      closed: boolean;
      onOpen: () => void;
    }
    // GuestbookHandlers 에 rsvp?: RsvpHandlers 추가 (InvitationView → Story/Scroll → PageContent 로 그대로 흐른다)
    ```
  - `RsvpFormModal(props: { visible: boolean; themeId: string; initial: RsvpInput; title: string; submitLabel: string; onClose: () => void; onSubmit: (input: RsvpInput) => Promise<'ok' | 'closed' | 'invalid'> })`
  - `CeremonyPage` 에 `showMap?: boolean`(기본 true), `children?: ReactNode`(장소 아래·지도 위). `export function MapCard`.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/features/invitation/__tests__/corporatePages.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { RsvpResponse } from '../../rsvp/rsvp';
import type { CorporateContent } from '../model';
import '../registerThemes';
import { createInvitation } from '../themes';
import { PageContent } from '../view/PageContent';

const inv = () => {
  const i = createInvitation({ id: 'i', ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today: new Date(2026, 9, 25) });
  const c = i.content as CorporateContent;
  c.ceremony = { ...c.ceremony, venue: '그랜드홀', audience: '파트너사 임직원', dressCode: '비즈니스 캐주얼' };
  c.contact = { name: '행사 사무국', phone: '02-123-4567', email: 'event@wuzu.kr' };
  c.directions = { parking: '지하 2층', transit: '' };
  return i;
};
const mine: RsvpResponse = {
  id: 'r', invitationId: 'i', name: '홍길동', attending: true, org: '우주', phone: '010-1234-5678', companions: 0,
  source: 'guest', createdAt: '', updatedAt: '',
};

describe('기업 하객 화면', () => {
  it('행사 개요: 대상·드레스코드가 보이고 지도는 오시는 길에만', () => {
    render(<PageContent page="ceremony" invitation={inv()} />);
    expect(screen.getByText('파트너사 임직원')).toBeTruthy();
    expect(screen.getByText('비즈니스 캐주얼')).toBeTruthy();
    expect(screen.queryByText('카카오맵')).toBeNull();
  });
  it('오시는 길: 지도 + 주차 (비운 대중교통은 안 보임)', () => {
    render(<PageContent page="directions" invitation={inv()} />);
    expect(screen.getByText('카카오맵')).toBeTruthy();
    expect(screen.getByText('지하 2층')).toBeTruthy();
    expect(screen.queryByText('대중교통')).toBeNull();
  });
  it('프로그램: 시간과 제목', () => {
    render(<PageContent page="program" invitation={inv()} />);
    expect(screen.getByText('14:30')).toBeTruthy();
    expect(screen.getByText('개회사')).toBeTruthy();
  });
  it('문의처: 전화·메일 버튼', () => {
    render(<PageContent page="contact" invitation={inv()} />);
    expect(screen.getByLabelText('전화 걸기')).toBeTruthy();
    expect(screen.getByLabelText('메일 보내기')).toBeTruthy();
  });
  it('참석 신청: 처음엔 신청 버튼, 낸 뒤엔 낸 내용과 고치기, 마감이면 고치기 없음', () => {
    const onOpen = jest.fn();
    const { rerender } = render(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine: null, closed: false, onOpen }} />);
    fireEvent.press(screen.getByText('참석 신청하기'));
    expect(onOpen).toHaveBeenCalled();
    rerender(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine, closed: false, onOpen }} />);
    expect(screen.getByText('응답을 보냈어요')).toBeTruthy();
    expect(screen.getByText('응답 고치기')).toBeTruthy();
    rerender(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine, closed: true, onOpen }} />);
    expect(screen.getByText('마감되었어요')).toBeTruthy();
    expect(screen.queryByText('응답 고치기')).toBeNull();
  });
  it('참석 신청: 연결이 없으면(미리보기) 안내만', () => {
    render(<PageContent page="rsvp" invitation={inv()} />);
    expect(screen.getByText('초대장을 활성화하면 하객이 신청할 수 있어요.')).toBeTruthy();
  });
});
```

(`IText`·`useLook` 가 `LookProvider` 없이 기본 룩으로 그려지는지 먼저 본다(`view/look.tsx`). 기본값이 없으면 테스트에서 `<LookProvider look={lookFor('corporate','corporate-1')}>` 로 감싸는 작은 `wrap` 함수를 쓴다 — Ruling 기록.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/corporatePages.test.tsx`
Expected: FAIL — 기업 분기가 없어 결혼식 부품이 `withGallery`/`asWedding` 에서 던지거나 문구가 없음.

- [ ] **Step 3: `CeremonyPage.tsx`**

`function MapCard` → `export function MapCard`. `CeremonyPage` 인자를 `{ ceremony, showMap = true, children, ...texts }: { ceremony: CeremonyInfo; showMap?: boolean; children?: ReactNode } & ThemeTexts` 로 바꾸고, 장소 `View` 뒤에 `{children}`, 지도 블록을 `{showMap && ceremony.mapMode === 'use' && (...)}` 로.

- [ ] **Step 4: `CorporatePages.tsx`**

```tsx
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { CorporateContent } from '../model';
import { CeremonyPage, MapCard } from './CeremonyPage';
import { IText, Page, PageTitle, useLook } from './look';

/** 기업 하객 화면 장 — 행사 개요·프로그램·연사·오시는 길·문의처 (설계 4장) */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <IText size={13} tone="sub">
        {label}
      </IText>
      <IText raw>{value}</IText>
    </View>
  );
}

/** 행사 개요: 일시·장소(공통, 지도 없이) + 대상·드레스코드 */
export function CorporateOverviewPage({ content }: { content: CorporateContent }) {
  const { ceremony } = content;
  const audience = ceremony.audience.trim();
  const dress = ceremony.dressCode.trim();
  return (
    <CeremonyPage
      ceremony={ceremony}
      showMap={false}
      placeTitle="장소"
      venuePlaceholder="장소 이름"
      ddayText={(n) => `행사까지 ${n}일 남았습니다.`}
      todayText="오늘은 행사 당일이에요"
    >
      {(!!audience || !!dress) && (
        <View style={styles.infos}>
          {!!audience && <InfoRow label="대상" value={audience} />}
          {!!dress && <InfoRow label="드레스코드" value={dress} />}
        </View>
      )}
    </CeremonyPage>
  );
}

/** 프로그램: 시간표 */
export function ProgramPage({ content }: { content: CorporateContent }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>프로그램</PageTitle>
      <View style={styles.table}>
        {content.program.items.map((it) => (
          <View key={it.id} style={[styles.slot, { borderColor: look.sub + '33' }]}>
            <View style={styles.time}>
              <IText size={14} tone="accent" align="left" raw>
                {it.time || '—'}
              </IText>
            </View>
            <View style={styles.flex}>
              <IText bold align="left" raw>
                {it.title}
              </IText>
              {!!it.detail.trim() && (
                <IText size={14} tone="sub" align="left" raw>
                  {it.detail}
                </IText>
              )}
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 연사 소개: 카드 목록 */
export function SpeakersPage({ content }: { content: CorporateContent }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>연사 소개</PageTitle>
      <View style={styles.cards}>
        {content.speakers.items.map((s) => (
          <View key={s.id} style={[styles.card, { borderColor: look.sub + '33' }]}>
            {s.photo ? (
              // key 를 주소로 — 사진을 바꾸면 깨진 표시가 남지 않게 새로 그린다
              <Image key={s.photo} source={{ uri: s.photo }} style={styles.face} resizeMode="cover" />
            ) : (
              <View style={[styles.face, { backgroundColor: look.sub + '22' }]} />
            )}
            <View style={styles.flex}>
              <IText bold align="left" raw>
                {s.name}
              </IText>
              {!!s.title.trim() && (
                <IText size={13} tone="sub" align="left" raw>
                  {s.title}
                </IText>
              )}
              {!!s.line.trim() && (
                <IText size={14} align="left" raw>
                  {s.line}
                </IText>
              )}
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 오시는 길: 지도(공통 틀) + 주차·대중교통 */
export function DirectionsPage({ content }: { content: CorporateContent }) {
  const { ceremony: e, directions: d } = content;
  const address = [e.address, e.addressDetail].filter(Boolean).join(' ');
  return (
    <Page>
      <PageTitle>오시는 길</PageTitle>
      <IText bold raw={!!e.venue}>
        {[e.venue || '장소 이름', e.hall].filter(Boolean).join(', ')}
      </IText>
      {e.mapMode === 'use' &&
        (e.addressMode === 'search' ? (
          <MapCard address={address} venue={e.venue} />
        ) : (
          e.mapImages.map((uri) => <Image key={uri} source={{ uri }} style={styles.mapImage} resizeMode="cover" />)
        ))}
      <View style={styles.infos}>
        {!!d.parking.trim() && <InfoRow label="주차" value={d.parking} />}
        {!!d.transit.trim() && <InfoRow label="대중교통" value={d.transit} />}
      </View>
    </Page>
  );
}

/** 문의처: 누르면 전화·메일 */
export function ContactPage({ content }: { content: CorporateContent }) {
  const look = useLook();
  const k = content.contact;
  const button = (label: string, a11y: string, url: string) => (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[styles.contactBtn, { borderColor: look.sub + '55' }]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <IText size={14} raw>
        {label}
      </IText>
    </Pressable>
  );
  return (
    <Page>
      <PageTitle>문의처</PageTitle>
      <IText bold raw>
        {k.name}
      </IText>
      <View style={styles.contactRow}>
        {!!k.phone.trim() && button(k.phone, '전화 걸기', `tel:${k.phone.replace(/-/g, '')}`)}
        {!!k.email.trim() && button(k.email, '메일 보내기', `mailto:${k.email.trim()}`)}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infos: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.lg },
  infoRow: { gap: 2, alignItems: 'center' },
  table: { alignSelf: 'stretch' },
  slot: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  time: { width: 56 },
  cards: { alignSelf: 'stretch', gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  face: { width: 64, height: 64, borderRadius: 32 },
  mapImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm },
  contactRow: { gap: spacing.sm, alignSelf: 'stretch' },
  contactBtn: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center' },
});
```

- [ ] **Step 5: `RsvpPage.tsx`**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { CorporateContent, formatShortDate } from '../model';
import { IText, Page, PageTitle, useLook } from './look';
import type { RsvpHandlers } from './PageContent';

/**
 * 참석 신청 장 — 장 안에는 버튼만 두고 입력은 모달에서 받는다
 * (스토리형에서 입력칸을 누르다 장이 넘어가지 않게)
 */
export function RsvpPage({ content, rsvp }: { content: CorporateContent; rsvp?: RsvpHandlers }) {
  const look = useLook();
  const deadline = content.rsvp.deadline;
  const button = (label: string, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      style={[styles.button, { backgroundColor: onPress ? look.accent : look.sub + '55' }]}
    >
      <IText bold style={styles.buttonText}>
        {label}
      </IText>
    </Pressable>
  );
  return (
    <Page>
      <PageTitle>참석 신청</PageTitle>
      {!!deadline && <IText tone="sub">{`${formatShortDate(deadline)}까지 알려 주세요.`}</IText>}
      {!rsvp ? (
        <>
          {button('참석 신청하기')}
          <IText size={13} tone="sub">
            초대장을 활성화하면 하객이 신청할 수 있어요.
          </IText>
        </>
      ) : rsvp.mine ? (
        <View style={[styles.done, { borderColor: look.sub + '44' }]}>
          <IText bold>응답을 보냈어요</IText>
          <IText tone="sub" raw>
            {rsvp.mine.name}
          </IText>
          <IText tone="accent">{rsvp.mine.attending ? '참석' : '불참'}</IText>
          {rsvp.closed ? (
            <IText size={13} tone="sub">
              마감되었어요
            </IText>
          ) : (
            button('응답 고치기', rsvp.onOpen)
          )}
        </View>
      ) : rsvp.closed ? (
        <IText tone="sub">마감되었어요</IText>
      ) : (
        button('참석 신청하기', rsvp.onOpen)
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  buttonText: { color: '#fff' },
  done: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
});
```

(`IText` 에 `style` 이 없으면 버튼 글자색을 `IText` 가 받는 다른 방법(돌잔치·CeremonyPage 가 흰 글자를 쓰는 방식 — `style={{ color: '#fff' }}`)으로 맞춘다. '{0}까지 알려 주세요.' 는 패턴 키로 번역된다.)

- [ ] **Step 6: `PageContent.tsx` 기업 분기 · `GreetingPage.tsx` 서명**

`GuestbookHandlers` 에 `rsvp?: RsvpHandlers` 를 더하고, `PageContent` 인자에서 `rsvp` 를 받는다. 돌잔치 분기 **앞에**:

```tsx
  if (isCorporate(content)) {
    switch (page) {
      case 'ceremony':
        return <CorporateOverviewPage content={content} />;
      case 'program':
        return <ProgramPage content={content} />;
      case 'speakers':
        return <SpeakersPage content={content} />;
      case 'directions':
        return <DirectionsPage content={content} />;
      case 'contact':
        return <ContactPage content={content} />;
      case 'rsvp':
        return <RsvpPage content={content} rsvp={rsvp} />;
      case 'greeting':
        return <GreetingPage content={content} />;
      case 'ending':
        return <EndingPage ending={content.ending} />;
      default:
        return null; // 기업에 없는 장 (갤러리·방명록·계좌)
    }
  }
```

`GreetingPage.tsx` `namesFor` 맨 앞에:

```ts
  if (isCorporate(content)) {
    // 기업: 이름 줄 없이 서명만 — '대표이사 김우주' (초청인이 없으면 주최)
    const sign = inviterLine(content.basic) || content.basic.host.trim();
    return { lines: [], signature: content.greeting.appendNames && sign ? sign : null };
  }
```

그리고 `const raw = isDol(content);` → `const raw = !isWedding(content);`. 서명 `IText` 도 `raw={raw}` 인지 확인한다(기업 서명은 사용자 글).

- [ ] **Step 7: `RsvpFormModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { TextField } from '../../components/TextField';
import { Txt } from '../../components/Txt';
import { colors, radius, spacing } from '../../theme';
import { RSVP_LIMITS, RSVP_MESSAGE, RsvpField, RsvpInput, rsvpFields, validateRsvp } from './rsvp';

/** 참석 응답 입력 — 하객(신청·고치기)과 만든 사람(직접 넣기·고치기)이 같이 쓴다 */
export function RsvpFormModal({
  visible,
  themeId,
  initial,
  title,
  submitLabel,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  themeId: string;
  initial: RsvpInput;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: RsvpInput) => Promise<'ok' | 'closed' | 'invalid'>;
}) {
  const [v, setV] = useState(initial);
  const [tried, setTried] = useState(false);
  const [closed, setClosed] = useState(false);
  // 열 때마다 처음 값으로 (initial 은 부모가 useMemo 로 고정해 넘긴다)
  useEffect(() => {
    if (!visible) return;
    setV(initial);
    setTried(false);
    setClosed(false);
  }, [visible, initial]);
  const fields = rsvpFields(themeId);
  const bad = validateRsvp(v, themeId);
  const show = (f: RsvpField) => tried && bad.includes(f);
  const msg = (f: RsvpField) => (show(f) ? RSVP_MESSAGE[f] : undefined);
  const submit = async () => {
    setTried(true);
    if (bad.length) return;
    const r = await onSubmit(v);
    if (r === 'closed') setClosed(true);
    if (r === 'ok') onClose();
  };
  return (
    <AppModal
      visible={visible}
      title={title}
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: submitLabel, onPress: submit },
      ]}
    >
      <View style={styles.form}>
        <TextField
          label="이름"
          required
          value={v.name}
          onChangeText={(name) => setV({ ...v, name })}
          maxLength={RSVP_LIMITS.name}
          invalid={show('name')}
          message={msg('name')}
        />
        {fields.includes('org') && (
          <TextField
            label="소속"
            required
            value={v.org}
            onChangeText={(org) => setV({ ...v, org })}
            maxLength={RSVP_LIMITS.org}
            invalid={show('org')}
            message={msg('org')}
          />
        )}
        {fields.includes('phone') && (
          <TextField
            label="연락처"
            required
            value={v.phone}
            onChangeText={(phone) => setV({ ...v, phone })}
            keyboardType="phone-pad"
            placeholder="010-1234-5678"
            invalid={show('phone')}
            message={msg('phone')}
          />
        )}
        <View style={styles.choice}>
          {[true, false].map((yes) => (
            <Pressable
              key={String(yes)}
              onPress={() => setV({ ...v, attending: yes })}
              accessibilityRole="button"
              accessibilityState={{ selected: v.attending === yes }}
              style={[styles.option, v.attending === yes && styles.optionOn]}
            >
              <Txt weight="semibold" color={v.attending === yes ? colors.brand : colors.label}>
                {yes ? '참석' : '불참'}
              </Txt>
            </Pressable>
          ))}
        </View>
        {fields.includes('companions') && v.attending && (
          <View style={styles.stepper}>
            <Txt style={styles.flex}>동반 인원</Txt>
            <Pressable
              onPress={() => setV({ ...v, companions: Math.max(0, v.companions - 1) })}
              accessibilityRole="button"
              accessibilityLabel="동반 인원 빼기"
            >
              <Txt variant="title">−</Txt>
            </Pressable>
            <Txt weight="semibold">{String(v.companions)}</Txt>
            <Pressable
              onPress={() => setV({ ...v, companions: Math.min(RSVP_LIMITS.companionsMax, v.companions + 1) })}
              accessibilityRole="button"
              accessibilityLabel="동반 인원 더하기"
            >
              <Txt variant="title">+</Txt>
            </Pressable>
          </View>
        )}
        {closed && (
          <Txt variant="caption" color={colors.danger}>
            마감되었어요
          </Txt>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md, alignSelf: 'stretch' },
  choice: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  optionOn: { borderColor: colors.brand },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
```

(`AppModal` 의 action 속성 이름(`variant: 'outline'`)은 방명록 관리 화면이 쓰는 것과 같다. 린트가 "effect 안 setState" 를 오류로 잡으면, 모달을 `visible` 일 때만 그리고 부모가 `key` 를 바꿔 새로 만드는 방식(`{visible && <RsvpFormBody key=... />}`)으로 바꾸고 Ruling.)

- [ ] **Step 8: 하객 화면 연결 (`src/app/invite/[id].tsx`)**

```tsx
  const [mine, setMine] = useState<RsvpResponse | null>(null);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  useEffect(() => {
    myRsvp
      .get(id)
      .then((rid) => (rid ? rsvpService.get(id, rid) : null))
      .then(setMine);
  }, [id]);
  const rsvpInitial = useMemo(() => mine ?? emptyRsvpInput(), [mine]);
```

초대장을 불러온 뒤(early return 아래):

```tsx
  const corp = isCorporate(invitation.content) ? invitation.content : null;
  const deadline = corp?.rsvp.deadline ?? '';
  // 만든 사람의 미리보기(활성 전)에서는 신청 버튼을 끈다 — 자기 명단에 시험 응답이 쌓이지 않게
  const preview = isOwner && screenStatus(invitation) !== 'active';
  const rsvp =
    corp && invitation.enabled.rsvp && !preview
      ? { mine, closed: isRsvpClosed(deadline, new Date()), onOpen: () => setRsvpOpen(true) }
      : undefined;
```

`<InvitationView ... rsvp={rsvp} />` 그리고 `GuestbookModals` 아래에:

```tsx
      {rsvp && (
        <RsvpFormModal
          visible={rsvpOpen}
          themeId={invitation.themeId}
          initial={rsvpInitial}
          title={mine ? '응답 고치기' : '참석 신청'}
          submitLabel={mine ? '고치기' : '보내기'}
          onClose={() => setRsvpOpen(false)}
          onSubmit={async (input) => {
            const r = await rsvpService.submit({
              invitationId: invitation.id,
              themeId: invitation.themeId,
              deadline,
              input,
              id: mine?.id,
            });
            if (!r.ok) return r.reason;
            setMine(r.response);
            await myRsvp.set(invitation.id, r.response.id);
            if (r.created) {
              await notificationService.add({
                userId: invitation.ownerId,
                category: 'rsvp',
                title: '새 참석 응답',
                body: `${r.response.name}님이 참석 응답을 보냈어요.`,
                link: `/invitation/${invitation.id}/rsvp`,
                createdAt: new Date().toISOString(),
              });
            }
            toast('응답을 보냈어요');
            return 'ok';
          }}
        />
      )}
```

(`useState`·`useEffect`·`useMemo` 는 early return **앞**에 둔다 — 훅 순서 규칙.)

- [ ] **Step 9: 번역·검사**

```bash
node "<scratchpad>/addEn.js" '{"장소":"Venue","장소 이름":"Venue name","행사까지 {0}일 남았습니다.":"{0} days until the event.","오늘은 행사 당일이에요":"Today is the event day","주차":"Parking","전화 걸기":"Call","메일 보내기":"Send email","{0}까지 알려 주세요.":"Please respond by {0}.","참석 신청하기":"RSVP now","초대장을 활성화하면 하객이 신청할 수 있어요.":"Guests can RSVP once the invitation is activated.","응답을 보냈어요":"Response sent","참석":"Attending","불참":"Not attending","마감되었어요":"RSVP is closed","응답 고치기":"Edit response","고치기":"Update","보내기":"Send","소속":"Organization","연락처":"Phone","동반 인원":"Guests","동반 인원 빼기":"Fewer guests","동반 인원 더하기":"More guests","새 참석 응답":"New RSVP","{0}님이 참석 응답을 보냈어요.":"{0} sent an RSVP."}'
npx jest && npx tsc --noEmit && npx expo lint
```

Expected: 전부 PASS, tsc 0, lint 늘지 않음.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: 기업 하객 화면 — 행사 개요·프로그램·연사·오시는 길·문의처 장, 참석 신청(모달 입력·기기 기억·마감·만든 사람 알림)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 만든 사람 — 참석 응답 명단 화면 · 나의 초대장 버튼

**Files:**
- Create: `src/app/invitation/[id]/rsvp.tsx`
- Modify: `src/app/invitation/[id]/_layout.tsx` (방명록처럼 화면 등록이 필요하면)
- Modify: `src/features/my-invites/InviteCard.tsx` (`'rsvp'` 동작, `rsvpCount`)
- Modify: `src/app/(tabs)/my-invites.tsx` (응답 수 불러오기, 이동)
- Test: `src/features/my-invites/__tests__/inviteCard.test.tsx`

**Interfaces:**
- Consumes: `rsvpService`, `rsvpTotals`, `rsvpFields`, `emptyRsvpInput`, `RsvpFormModal`, `themeDef`.
- Produces: `CardAction` 에 `'rsvp'`; `InviteCard` props 에 `rsvpCount?: number`.
  - 카드 규칙: 그 테마에 방명록 섹션이 없고 참석 신청 섹션이 있으면 방명록 버튼 자리에 `참석 응답 (N)`. `enabled.rsvp` 가 꺼져 있으면 끈 상태.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/features/my-invites/__tests__/inviteCard.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Invitation } from '../../invitation/model';
import '../../invitation/registerThemes';
import { createInvitation } from '../../invitation/themes';
import { InviteCard } from '../InviteCard';

const now = new Date(2026, 9, 25);
const card = (themeId: string): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId, templateId: `${themeId}-1`, today: now }),
  status: 'final',
});

describe('나의 초대장 카드 — 참석 응답', () => {
  it('기업 초대장은 방명록 대신 [참석 응답 (N)]', () => {
    const onAction = jest.fn();
    render(<InviteCard invitation={card('corporate')} now={now} hasNew={false} rsvpCount={3} onAction={onAction} />);
    expect(screen.queryByText('방명록')).toBeNull();
    fireEvent.press(screen.getByText('참석 응답 (3)'));
    expect(onAction).toHaveBeenCalledWith('rsvp');
  });
  it('결혼식 카드는 그대로 방명록', () => {
    render(<InviteCard invitation={card('wedding')} now={now} hasNew={false} onAction={jest.fn()} />);
    expect(screen.getByText('방명록')).toBeTruthy();
    expect(screen.queryByText(/참석 응답/)).toBeNull();
  });
});
```

(`status: 'final'` 은 "활성화 전" 버튼 줄이다. `InviteCard` 가 다른 props 를 요구하면 테스트에 맞춰 넣는다.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/my-invites`
Expected: FAIL — '방명록' 이 보이고 '참석 응답 (3)' 없음.

- [ ] **Step 3: `InviteCard.tsx`**

```tsx
  const def = themeDef(invitation.themeId);
  // 방명록이 없는 테마(기업)는 그 자리에 참석 응답
  const hasSection = (k: OptionalSection) => def.optional.some((s) => s.key === k);
  const rsvpSlot = !hasSection('guestbook') && hasSection('rsvp');
  const bookButton = (withNew: boolean) =>
    rsvpSlot ? (
      <CardButton
        label={`참석 응답 (${rsvpCount ?? 0})`}
        onPress={() => onAction('rsvp')}
        disabled={!invitation.enabled.rsvp}
      />
    ) : (
      <CardButton
        label={withNew && guestbookOn && hasNew ? '(New) 방명록' : '방명록'}
        onPress={() => onAction('guestbook')}
        disabled={!guestbookOn}
      />
    );
```

활성화 전 줄의 방명록 버튼 → `{bookButton(false)}`, 활성 줄 → `{bookButton(true)}`. `CardAction` 에 `'rsvp'`, props 에 `rsvpCount?: number`.

- [ ] **Step 4: `my-invites.tsx`**

`newBook` 을 불러오는 곳 옆에:

```tsx
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
```

```tsx
      const counts = await Promise.all(
        list.filter((i) => i.enabled.rsvp).map(async (i) => [i.id, (await rsvpService.list(i.id)).length] as const),
      );
      setRsvpCounts(Object.fromEntries(counts));
```

`onCard` 의 switch 에 `case 'rsvp': return router.push(\`/invitation/${inv.id}/rsvp\`);`, `<InviteCard ... rsvpCount={rsvpCounts[inv.id]} />`. 명단 화면에서 돌아올 때 다시 세도록 목록을 다시 부르는 자리(포커스 때)에서 같이 센다.

- [ ] **Step 5: 명단 화면 `src/app/invitation/[id]/rsvp.tsx`**

방명록 관리 화면(`guestbook.tsx`)과 같은 틀:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import type { Invitation } from '../../../features/invitation/model';
import { emptyRsvpInput, RsvpResponse, rsvpFields, rsvpTotals } from '../../../features/rsvp/rsvp';
import { RsvpFormModal } from '../../../features/rsvp/RsvpFormModal';
import { invitationService, rsvpService } from '../../../services';
import { colors, radius, spacing } from '../../../theme';

/** 참석 응답 명단 (만든 사람): 합계, 직접 넣기·고치기·지우기 (설계 6장) */
export default function RsvpManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [rows, setRows] = useState<RsvpResponse[] | null>(null);
  const [editing, setEditing] = useState<RsvpResponse | 'new' | null>(null);
  const [removing, setRemoving] = useState<RsvpResponse | null>(null);
  const load = useCallback(async () => setRows(await rsvpService.list(id)), [id]);
  useEffect(() => {
    invitationService.get(id).then(setInv);
    load();
  }, [id, load]);
  const themeId = inv?.themeId ?? 'corporate';
  const companions = rsvpFields(themeId).includes('companions');
  const totals = rsvpTotals(rows ?? []);
  const initial = useMemo(() => (editing && editing !== 'new' ? editing : emptyRsvpInput()), [editing]);

  const header = (
    <Header
      title="참석 응답"
      hideBack
      right={
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      }
    />
  );

  return (
    <Screen header={header} background={colors.surface} contentStyle={styles.content}>
      {rows === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : (
        <>
          <View style={styles.summary}>
            <Txt weight="semibold">
              {companions
                ? `참석 ${totals.people}명(동반 포함) · 불참 ${totals.declined}명`
                : `참석 ${totals.attending}명 · 불참 ${totals.declined}명`}
            </Txt>
            <Pressable onPress={() => setEditing('new')} style={styles.addBtn} accessibilityRole="button">
              <Ionicons name="add" size={16} color={colors.brand} />
              <Txt variant="caption" weight="semibold" color={colors.brand}>
                응답 추가
              </Txt>
            </Pressable>
          </View>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Txt color={colors.muted}>아직 받은 응답이 없어요.</Txt>
            </View>
          ) : (
            rows.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.flex}>
                  <View style={styles.row}>
                    <Txt weight="semibold" raw>
                      {r.name}
                    </Txt>
                    <Txt variant="caption" color={r.attending ? colors.success : colors.muted}>
                      {r.attending ? '참석' : '불참'}
                    </Txt>
                    {r.source === 'manual' && (
                      <Txt variant="tiny" color={colors.infoInk}>
                        직접 입력
                      </Txt>
                    )}
                  </View>
                  <Txt variant="caption" color={colors.label} raw={!companions}>
                    {companions ? `동반 ${r.companions}명` : [r.org, r.phone].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <Pressable onPress={() => setEditing(r)} style={styles.icon} accessibilityRole="button" accessibilityLabel="고치기">
                  <Ionicons name="create-outline" size={18} color={colors.label} />
                </Pressable>
                <Pressable onPress={() => setRemoving(r)} style={styles.icon} accessibilityRole="button" accessibilityLabel="삭제">
                  <Ionicons name="close" size={18} color={colors.label} />
                </Pressable>
              </View>
            ))
          )}
        </>
      )}
      <RsvpFormModal
        visible={!!editing}
        themeId={themeId}
        initial={initial}
        title={editing === 'new' ? '응답 추가' : '응답 고치기'}
        submitLabel={editing === 'new' ? '추가' : '고치기'}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          try {
            if (editing === 'new') await rsvpService.addManual(id, themeId, input);
            else if (editing) await rsvpService.update(id, themeId, editing.id, input);
          } catch {
            return 'invalid';
          }
          await load();
          return 'ok';
        }}
      />
      <AppModal
        visible={!!removing}
        title="삭제하시겠습니까?"
        onDismiss={() => setRemoving(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setRemoving(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!removing) return;
              await rsvpService.remove(id, removing.id);
              setRemoving(null);
              toast('삭제가 완료되었습니다.');
              load();
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 80 },
  content: { padding: spacing.lg, gap: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline },
});
```

(`Txt` 의 번역 끄는 속성 이름이 `raw` 가 아니면 그 이름으로. 이름·소속은 사용자 글이라 번역하지 않는다.)

- [ ] **Step 6: 번역·검사**

```bash
node "<scratchpad>/addEn.js" '{"참석 응답 ({0})":"RSVPs ({0})","참석 응답":"RSVPs","참석 {0}명 · 불참 {1}명":"{0} attending · {1} not attending","참석 {0}명(동반 포함) · 불참 {1}명":"{0} attending (incl. guests) · {1} not attending","응답 추가":"Add response","추가":"Add","직접 입력":"Added manually","동반 {0}명":"{0} guests","아직 받은 응답이 없어요.":"No responses yet."}'
npx jest && npx tsc --noEmit && npx expo lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 참석 응답 명단 화면(합계·직접 넣기·고치기·지우기)과 나의 초대장 [참석 응답 (N)] 버튼

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 기업 예시 초대장 · AI 사진 · 템플릿 미리보기와 만들기 허용

**Files:**
- Create: `assets/sample/corporate/{hall.jpg, networking.jpg, speaker-1.jpg, speaker-2.jpg, speaker-3.jpg, logo.png}`
- Modify: `src/features/invitation/sample.ts` (`corporateSample`)
- Modify: `src/app/create/[theme]/index.tsx` (`DolCoverCard` → 테마 공용 `SampleCoverCard`)
- Modify: `src/app/create/[theme]/[templateId].tsx` (실제 초대장 미리보기에 corporate)
- Modify: `src/features/create/useRequireLoginToCreate.tsx` (`EDITABLE_THEMES` 에 'corporate')
- Test: `src/features/invitation/__tests__/sample.test.ts`

**Interfaces:**
- Consumes: Task 2 `defaultCorporateContent`·검사, `sectionTabs`, `validateFor`.
- Produces: `sampleInvitation('corporate', templateId)` — 사용 중인 모든 탭이 검사를 통과하는 예시(연사 3명, 연사 소개 켬).

- [ ] **Step 1: 실패하는 테스트**

`sample.test.ts` 에:

```ts
it('기업 예시: 모든 탭이 검사를 통과하고 연사 소개가 켜져 있다', () => {
  const inv = sampleInvitation('corporate', 'corporate-1', new Date(2026, 9, 25));
  expect(inv.themeId).toBe('corporate');
  expect(inv.enabled.speakers).toBe(true);
  for (const k of sectionTabs(inv)) expect([k, validateFor(inv, k)]).toEqual([k, []]);
});
```

(`sectionTabs`, `validateFor` 를 `../themes` 에서 import.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/sample.test.ts`
Expected: FAIL — 기업 예시가 결혼식 예시 함수로 가서 `asWedding` 이 던짐.

- [ ] **Step 3: AI 사진 (무료 모델)**

돌잔치 때와 같은 방법(Z Image, 무료)으로 6장. 프롬프트(실존 인물·실존 브랜드 아님, 글자·워터마크 없음):
- hall: "modern conference hall with stage and soft blue lighting, rows of empty chairs, wide shot, photorealistic, no text"
- networking: "business networking reception with standing tables and warm lighting, people seen from behind, photorealistic, no text"
- speaker-1: "professional headshot of a Korean woman in her 40s, navy blazer, neutral gray background, photorealistic"
- speaker-2: "professional headshot of a Korean man in his 30s, white shirt, neutral gray background, photorealistic"
- speaker-3: "professional headshot of a Korean woman in her 30s, beige jacket, neutral gray background, photorealistic"
- logo: "minimal abstract geometric logo mark, a simple planet with a ring, flat navy on white background, no text, centered"

긴 변 1080px JPEG(로고는 512px PNG)로 줄여 `assets/sample/corporate/` 에 둔다. 도구가 없거나 한도로 만들 수 없으면 로고·연사 사진을 `null` 로 두고(화면은 빈 얼굴 동그라미, 표지 로고 없음) Ruling 으로 남긴다 — 그 경우 Step 4 의 `require` 줄을 빼고 테스트는 그대로 통과해야 한다.

- [ ] **Step 4: `sample.ts`**

```ts
// 기업 예시 사진: AI 로 만든 사진 (실존 인물·회사 아님)
const CORP_PHOTOS = {
  hall: () => uri(require('../../../assets/sample/corporate/hall.jpg')),
  networking: () => uri(require('../../../assets/sample/corporate/networking.jpg')),
  logo: () => uri(require('../../../assets/sample/corporate/logo.png')),
  speakers: () => [
    uri(require('../../../assets/sample/corporate/speaker-1.jpg')),
    uri(require('../../../assets/sample/corporate/speaker-2.jpg')),
    uri(require('../../../assets/sample/corporate/speaker-3.jpg')),
  ],
};

/** 기업 예시 — 가상의 회사 '우주컴퍼니' 파트너스 데이 (이름·문구는 예시) */
function corporateSample(templateId: string, today: Date): Invitation {
  const inv = createInvitation({ id: 'sample', ownerId: '', themeId: 'corporate', templateId, today });
  const c = inv.content as CorporateContent;
  const days = (n: number) => toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  c.basic = {
    eventName: /* i18n-ignore */ '2026 우주 파트너스 데이',
    host: /* i18n-ignore */ '(주)우주컴퍼니',
    logo: CORP_PHOTOS.logo(),
    inviterTitle: /* i18n-ignore */ '대표이사',
    inviterName: /* i18n-ignore */ '김우주',
  };
  c.ceremony = {
    ...c.ceremony,
    date: days(14),
    time: '14:00',
    venue: /* i18n-ignore */ '우주 컨벤션센터',
    hall: /* i18n-ignore */ '3층 그랜드홀',
    address: /* i18n-ignore */ '서울 강남구 테헤란로 521',
    zonecode: '06164',
    audience: /* i18n-ignore */ '파트너사 임직원',
    dressCode: /* i18n-ignore */ '비즈니스 캐주얼',
  };
  c.greeting = { ...c.greeting, photo: CORP_PHOTOS.hall() };
  c.program = {
    items: [
      ['14:00', /* i18n-ignore */ '등록 및 네트워킹', ''],
      ['14:30', /* i18n-ignore */ '개회사', /* i18n-ignore */ '대표이사 김우주'],
      ['15:00', /* i18n-ignore */ '기조 강연', /* i18n-ignore */ '박서연 연구소장'],
      ['16:00', /* i18n-ignore */ '파트너 세션', /* i18n-ignore */ '이준호 · 최민지'],
      ['17:30', /* i18n-ignore */ '만찬', ''],
    ].map(([time, title, detail], i) => ({ id: `p${i}`, time, title, detail })),
  };
  const faces = CORP_PHOTOS.speakers();
  c.speakers = {
    items: [
      [/* i18n-ignore */ '박서연', /* i18n-ignore */ '우주랩 연구소장', /* i18n-ignore */ 'AI가 바꾸는 일하는 방식'],
      [/* i18n-ignore */ '이준호', /* i18n-ignore */ '그로스팀 리드', /* i18n-ignore */ '작은 팀의 큰 성장'],
      [/* i18n-ignore */ '최민지', /* i18n-ignore */ '디자인 디렉터', /* i18n-ignore */ '브랜드 경험 설계'],
    ].map(([name, title, line], i) => ({ id: `s${i}`, photo: faces[i], name, title, line })),
  };
  c.directions = {
    parking: /* i18n-ignore */ '건물 지하 2~4층 주차 (3시간 무료)',
    transit: /* i18n-ignore */ '2호선 삼성역 5번 출구 도보 5분',
  };
  c.rsvp = { deadline: days(10) };
  c.contact = { name: /* i18n-ignore */ '행사 사무국', phone: '02-123-4567', email: 'event@wuzu.example' };
  c.ending = { ...c.ending, photos: [CORP_PHOTOS.networking()] };
  inv.enabled = { ...inv.enabled, speakers: true };
  inv.completed = Object.fromEntries(sectionTabs(inv).map((k) => [k, true]));
  return inv;
}
```

`sampleInvitation` 을:

```ts
export function sampleInvitation(themeId: string, templateId: string, today: Date = new Date()): Invitation {
  if (themeId === 'dol') return dolSample(templateId, today);
  if (themeId === 'corporate') return corporateSample(templateId, today);
  return weddingSample(templateId, today);
}
```

(`sectionTabs`(./themes)·`CorporateContent`(./model) import.)

- [ ] **Step 5: 템플릿 카드·미리보기·만들기 허용**

- `create/[theme]/index.tsx`: `DolCoverCard` → `SampleCoverCard({ themeId, templateId, bg, width, height })`. 안에서 `sampleInvitation(themeId, templateId)`, `useMemo` 의존값에 `themeId`. 카드 분기를 `themeId === 'dol' || themeId === 'corporate'` 로, 주석 "돌잔치·기업은 실제 표지로".
- `create/[theme]/[templateId].tsx`: `const wedding = themeId === 'wedding' || themeId === 'dol';` → `const realPreview = ['wedding', 'dol', 'corporate'].includes(themeId);` 로 바꾸고 아래 쓰임을 모두 같은 이름으로.
- `useRequireLoginToCreate.tsx`: `const EDITABLE_THEMES = ['wedding', 'dol', 'corporate'];`

- [ ] **Step 6: 검사**

Run: `npx jest && npx tsc --noEmit && npx expo lint`
Expected: 전부 PASS, tsc 0, lint 늘지 않음.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 기업 템플릿 미리보기 — 예시 초대장과 AI 사진, 템플릿 카드 실제 표지, 만들기 허용

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 마무리 검사 · 브라우저 QA · 보고서

**Files:**
- Modify: `docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md` (6장 "확인 필요" → 확인됨)
- Create: QA 보고서 HTML (scratchpad) → 아티팩트

- [ ] **Step 1: 전체 검사**

Run: `npx tsc --noEmit; npx jest 2>&1 | tail -5; npx expo lint 2>&1 | tail -2`
Expected: tsc 0, jest 전부 PASS, lint 21 errors / 7 warnings 이하.

- [ ] **Step 2: 브라우저 QA**

개발 서버는 메모리 부족으로 자주 꺼진다 — 꺼져 있으면 사용자에게 켜도 되는지 묻고 켠다. 412px·1280px 폭, 스토리형·스크롤형 각각:
1. 홈 → 기업 행사 → 템플릿 카드 10종이 실제 표지(로고·행사명)로 보인다.
2. 템플릿 미리보기: 표지·초청 인사(서명 '대표이사 김우주')·행사 개요(대상·드레스코드, 지도 없음)·프로그램·연사·오시는 길(지도·주차·교통)·참석 신청(꺼진 버튼+안내)·문의처·엔딩.
3. 테스트 계정으로 만들기 → 입력항목 선택에 방명록·계좌·갤러리 없음, 행사 개요·오시는 길은 필수.
4. 각 시트 입력 → ✓ → 최종저장. 로고를 비우면 표지에 빈 틀이 없다. 프로그램 ☰ 끌어 순서 바꾸기.
5. 하객 화면(`/invite/{id}`, 로그아웃한 다른 탭): 참석 신청 → 모달 → 빈 이름 안내 → 보내기 → "응답을 보냈어요" → 새로고침 뒤에도 보임 → 응답 고치기. **스토리형에서 모달 입력칸을 눌러도 장이 넘어가지 않는다.**
6. 나의 초대장 카드 `참석 응답 (1)` → 명단: 합계, [+ 응답 추가]로 넣은 행에 "직접 입력", 고치기, 지우기.
7. 알림 목록에 "새 참석 응답"(사람 아이콘).
8. 마감일을 어제로 둔 초대장: 하객 화면 "마감되었어요", 고치기 버튼 없음.
9. 결혼식·돌잔치 회귀: 미리보기·만들기·하객 화면이 전과 같다.
10. 영어 모드: 새 문구가 모두 영어, 기업 기본 문구·칩이 영어.

- [ ] **Step 3: 보고서 · 설계 문서 갱신 · Commit**

QA 결과(통과/실패, 확인 화면, 미룬 항목, Ruling 전부)를 HTML 보고서로 만들어 아티팩트로 올린다(사용자 규칙). 설계 문서 6장의 "확인 필요: …" 줄을 "확인됨(2026-10-25): 명단에 응답 행을 직접 추가하는 뜻이 맞다." 로 바꾼다.

```bash
git add docs
git commit -m "docs: 참석 응답 해석 확인 반영

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
