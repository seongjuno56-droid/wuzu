# 표지 캔버스 꾸미기 · 스토리형/스크롤형 보기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결혼식 초대장에 스토리형/스크롤형 보기(제작자 선택)를 더하고, 표지를 인스타 스토리처럼 직접 꾸미는 캔버스 편집기를 만든다.

**Architecture:** 캔버스는 순수 데이터(`CanvasDoc`: 비율 좌표 요소 목록)와 순수 함수(`src/features/canvas/model.ts`)가 중심이다. 같은 렌더러(`CanvasSlide`)가 형식 표지(템플릿 프리셋)·캔버스 표지·편집기·하객 보기에 모두 쓰인다. 편집기는 gesture-handler 제스처로 요소 하나의 "진행 중 값"만 React 상태로 바꾸고, 손을 떼면 편집 스토어 기록(되돌리기)에 한 번 커밋한다.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, Zustand, react-native-gesture-handler, react-native-svg, expo-image, expo-video, expo-clipboard, expo-image-picker, expo-image-manipulator, jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-16-canvas-cover-and-view-modes-design.md` (이전 단계: `docs/superpowers/specs/2026-10-15-wedding-invitation-editor-design.md`)

## Global Constraints

- 영어 필수 표기(코드 식별자·명령어·고유명사·`feat:` 같은 접두어·Co-Authored-By 줄) 외 사용자 문구·주석·커밋 메시지는 모두 한국어.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 패키지는 `npx expo install <pkg>`만 사용. Expo Go 포함 모듈만 쓴다(개발용 빌드 필요 모듈 금지).
- `ios/`, `android/` 폴더를 만들거나 고치지 않는다.
- 라우트는 `src/app/`에만, 나머지 코드는 `src/features/`·`src/components/`.
- 디자인 토큰은 `src/theme/index.ts`(화해 스타일: 흰 카드·`#e8e8e8` 헤어라인·Pretendard 400/600, 주 버튼 다크블록). 색은 템플릿·이미지에서만.
- 서버 없음: 저장은 mock 서비스(AsyncStorage). 웹 GIF·동영상은 객체 URL(새로고침 시 사라짐).
- 제한: 캔버스 요소 30개(선 포함), GIF 10MB·3개, 동영상 15초·30MB·1개(mp4·mov), 텍스트 100자, 되돌리기 50단계, 사진은 긴 변 1280px 압축(투명 PNG는 PNG 유지).
- 보기 반응형: 스토리형은 9:16 "맞춤" 후 가운데, 폭 600px 이상에서 좌우 화살표+키보드 ←/→. 스크롤형은 본문 최대 폭 480px 가운데.
- 개발 서버는 사용자가 요청할 때만 켠다(메모리 부족으로 자동 종료된 적 있음).
- 작업 완료 전: `npx tsc --noEmit`, `npx jest`, (최종 작업에서) `npx expo lint`, `npx expo-doctor`.

## Review Focus

1. **웹 저장 용량 초과** — 웹에서 GIF·동영상을 data URI로 저장하면 localStorage 한도를 넘어 저장이 실패한다. 기대: 객체 URL로 바꿔 보관하고 저장은 성공(Task 2 `needsSessionUrl` 테스트, Task 11에서 사용).
2. **기존 저장본 열기** — `viewMode`·`design`이 없는 예전 초대장을 불러와도 깨지지 않고 스토리형·형식 표지로 보인다(Task 3 mock 서비스 테스트).
3. **이름이 빈 연결 텍스트** — 기본정보를 아직 안 쓴 상태에서 표지에 "신랑 ♥ 신부" 같은 안내 글자가 흐리게 보인다(Task 2 `resolveBind` 테스트).
4. **폴드 접기/펴기·PC 폭** — 360×640, 600×700, 1280×800에서 슬라이드가 잘리지 않고 9:16을 유지한다(Task 2 `fitSlide` 테스트, Task 6에서 `useWindowDimensions`·onLayout으로 재계산).
5. **한도 경계** — 30번째 요소는 들어가고 31번째(펜 선 포함)는 거부, GIF 4번째·동영상 2번째 거부. 한 번의 끌기/핀치는 되돌리기 1단계(Task 2 `canAdd`, Task 4 기록 테스트).

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/features/canvas/types.ts` | 캔버스·보기 타입만 (런타임 코드 없음) |
| `src/features/canvas/model.ts` | 상수·제한, 연결 텍스트, 좌표·붙기·맞춤 계산, 문서 조작, 미디어 검사 |
| `src/features/canvas/preset.ts` | 템플릿 표지 → `CanvasDoc` 프리셋 |
| `src/features/canvas/canvasStore.ts` | 캔버스 편집 상태(선택·도구·되돌리기 기록) |
| `src/features/canvas/media.ts` | 사진·GIF·동영상 고르기, 압축, 웹 객체 URL |
| `src/features/canvas/paste.ts` | 클립보드 읽기(앱·웹), 붙여넣기 이벤트 |
| `src/features/canvas/useWebCanvasKeys.ts` | 웹 단축키(삭제·되돌리기·붙여넣기) |
| `src/features/canvas/render/CanvasSlide.tsx` | 읽기 전용 슬라이드(배경+요소) |
| `src/features/canvas/render/ElementView.tsx` | 요소 위치 상자 + 종류별 내용 |
| `src/features/canvas/render/VideoElement.tsx` | 소리 없는 반복 동영상 |
| `src/features/canvas/render/BrokenMedia.tsx` | 불러오기 실패 회색 상자 |
| `src/features/canvas/editor/CanvasEditor.tsx` | 편집 화면 전체(상단 바·툴바·슬라이드·속성 바) |
| `src/features/canvas/editor/EditableElement.tsx` | 요소 제스처(이동·크기·회전·선택·더블탭) + 손잡이 |
| `src/features/canvas/editor/Guides.tsx` | 가운데 가이드선 |
| `src/features/canvas/editor/CanvasToolbar.tsx` | 도구 버튼 줄 |
| `src/features/canvas/editor/PropertyBar.tsx` | 선택 요소 속성 바 |
| `src/features/canvas/editor/TextEditModal.tsx` | 텍스트 입력 모달 |
| `src/features/canvas/editor/Pickers.tsx` | 스티커·연결 텍스트·배경 선택 모달 |
| `src/features/canvas/editor/PenLayer.tsx` | 펜 그리기 덮개 + 펜 옵션 바 |
| `src/features/invitation/view/CoverSlide.tsx` | 초대장 → 표지 문서 결정 후 `CanvasSlide` |
| `src/features/invitation/view/PageContent.tsx` | 표지 외 페이지 하나 그리기 |
| `src/features/invitation/view/FormSlide.tsx` | 형식 페이지를 9:16 칸 안에(넘치면 스크롤) |
| `src/features/invitation/view/ScrollInvitation.tsx` | 스크롤형 보기 |
| `src/features/invitation/view/StoryInvitation.tsx` | 스토리형 보기 |
| `src/features/invitation/editor/pages.ts` | 페이지↔섹션 연결, 독바 항목 |
| `src/features/invitation/editor/DockBar.tsx` | 하단 독바 |
| `src/features/invitation/editor/SlideStage.tsx` | Step5 가운데 슬라이드 넘김 |
| `src/features/invitation/editor/ViewModePicker.tsx` | 스토리형/스크롤형 선택 카드 + 모달 |
| `src/app/create/editor/preview.tsx` | Step5 미리보기 라우트 |

수정: `src/features/invitation/model.ts`, `editorStore.ts`, `view/InvitationView.tsx`, `view/look.tsx`, `src/data/templates.ts`, `src/services/mock/mockInvitationService.ts`, `src/components/brand/Icon3D.tsx`, `src/app/_layout.tsx`, `src/app/invite/[id].tsx`, `src/app/create/[theme]/[templateId].tsx`, `src/app/create/editor/compose.tsx`, `src/features/create/useRequireLoginToCreate.tsx`, `src/features/invitation/editor/SectionSheet.tsx`. 삭제: `view/CoverPage.tsx`.

---

### Task 1: 의존성 설치와 루트 설정

**Files:**
- Modify: `package.json`(설치 명령으로), `src/app/_layout.tsx`

**Interfaces:**
- Produces: 앱 전체가 `GestureHandlerRootView` 안에 있음. 웹에서 `/invite/*` 경로는 폰 폭 틀(`MAX_APP_WIDTH`) 없이 화면 전체를 쓴다.

- [ ] **Step 1: 패키지 설치**

Run: `npx expo install react-native-gesture-handler react-native-svg expo-image expo-video`
Expected: package.json dependencies에 4개 추가, 오류 없음.

- [ ] **Step 2: 설치 버전의 API 확인**

Run: `node -e "console.log(require('react-native-gesture-handler/package.json').version)"`
Expected: 버전 출력. 2.x면 이 계획의 `Gesture.Pan()` 빌더 API를 그대로 쓴다. 3.x면 `node_modules/react-native-gesture-handler/lib/typescript` 타입에서 `Gesture` 빌더가 남아 있는지 확인하고, 없으면 같은 동작의 훅 API(`usePanGesture` 등)로 Task 9·12 코드를 옮긴다.

- [ ] **Step 3: 루트 레이아웃 수정**

`src/app/_layout.tsx` 전체를 다음으로 바꾼다.

```tsx
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import { useSession } from '../store/session';
import { colors, fontSources, MAX_APP_WIDTH } from '../theme';

const FONT_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  const hydrated = useSession((s) => s.hydrated);
  // 하객이 웹으로 여는 초대장은 폴드·태블릿·PC 폭을 그대로 쓴다
  const fullBleed = useSegments()[0] === 'invite';
  // 폰트 CDN이 느리거나 막혀도 시스템 폰트로 계속 진행
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = hydrated && (fontsLoaded || !!fontError || fontTimedOut);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* 웹에서도 폰 폭으로 보이도록 앱 전체를 가운데 고정 폭 프레임에 담는다 */}
        <View style={styles.outer}>
          <View style={[styles.frame, fullBleed && styles.fullBleed]}>
            {ready && (
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
            )}
            <ToastHost />
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  outer: { flex: 1, backgroundColor: colors.surfaceStrong, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, backgroundColor: colors.bg, overflow: 'hidden' },
  fullBleed: { maxWidth: undefined },
});
```

- [ ] **Step 4: 타입·테스트 확인**

Run: `npx tsc --noEmit && npx jest`
Expected: 오류 0, 기존 112개 통과.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json src/app/_layout.tsx
git commit -m "chore: 제스처·SVG·이미지·동영상 패키지 추가, 초대장 보기 화면은 웹 전체 폭 사용

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 캔버스 타입과 순수 로직

**Files:**
- Create: `src/features/canvas/types.ts`, `src/features/canvas/model.ts`
- Test: `src/features/canvas/__tests__/model.test.ts`

**Interfaces:**
- Consumes: `InvitationContent`, `parseDate`, `formatKoreanTime`, `WEEKDAYS_KO`, `WEEKDAYS_EN` (`src/features/invitation/model.ts`), `fonts` (`src/theme`)
- Produces (이후 모든 작업이 씀):
  - 타입: `ViewMode`, `FontKey`, `TextAlign`, `BindKey`, `CanvasBackground`, `CanvasElement`, `ElementKind`, `CanvasDoc`, `SlideDesign`, `StrokeElement`
  - 상수: `SLIDE_RATIO`(=16/9, 높이÷폭), `CANVAS_LIMITS`, `CANVAS_FONTS`, `BIND_LABEL`, `LIMIT_MESSAGE`, `VIDEO_EXTENSIONS`, `MIN_W`, `MAX_W`
  - 함수: `newElementId()`, `resolveBind(bind, content) → { text, placeholder }`, `canAdd(doc, kind) → LimitError | null`, `snapCenter(x, y) → { x, y, guideX, guideY }`, `snapRotation(deg)`, `clamp01(v)`, `clampWidth(w)`, `fitSlide(availW, availH) → { width, height }`, `strokeFromPoints(points, slideW, color, widthPx) → StrokeElement | null`, `addElement(doc, el)`, `updateElement(doc, id, patch)`, `removeElement(doc, id)`, `duplicateElement(doc, id) → { doc, id }`, `reorderElement(doc, id, 'front' | 'back')`, `palette(style) → string[]`, `checkGif({ size })`, `checkVideo({ name, mimeType, size, durationMs })`, `isGifFile({ name, mimeType, uri })`, `needsSessionUrl(kind, uri, platform)`, `textForPaste(s)`

- [ ] **Step 1: 타입 파일 작성**

`src/features/canvas/types.ts`:

```ts
/** 캔버스(직접 꾸미기)·보기 형태 타입 — 런타임 코드 없이 타입만 둔다 (초대장 모델이 가져다 쓴다) */

export type ViewMode = 'story' | 'scroll';

export type FontKey = 'sans' | 'sansBold' | 'serif' | 'serifBold';
export type TextAlign = 'left' | 'center' | 'right';

/** 폼 값과 연결된 텍스트 — 글자는 그릴 때 폼 값으로 만든다 */
export type BindKey = 'groomName' | 'brideName' | 'coupleNames' | 'date' | 'weekday' | 'datetime' | 'time' | 'venue';

export type CanvasBackground =
  | { kind: 'template' }
  | { kind: 'color'; color: string }
  | { kind: 'image'; uri: string };

/** 좌표·크기는 모두 슬라이드 대비 비율 → 어떤 화면 폭에서도 같은 모습 */
export interface ElementBase {
  id: string;
  /** 중심 x, 슬라이드 폭 대비 0~1 */
  x: number;
  /** 중심 y, 슬라이드 높이 대비 0~1 */
  y: number;
  /** 폭, 슬라이드 폭 대비 */
  w: number;
  /** 회전(도) */
  rotation: number;
}

export interface TextLook {
  font: FontKey;
  color: string;
  /** 글자 크기, 슬라이드 폭 대비 */
  size: number;
  align: TextAlign;
}

export type TextElement = ElementBase & TextLook & { kind: 'text'; text: string };
export type BoundElement = ElementBase & TextLook & { kind: 'bound'; bind: BindKey };
/** aspect = 높이 ÷ 폭 */
export type ImageElement = ElementBase & { kind: 'image'; uri: string; aspect: number; shape: 'rect' | 'rounded' | 'circle' };
export type GifElement = ElementBase & { kind: 'gif'; uri: string; aspect: number };
export type VideoElement = ElementBase & { kind: 'video'; uri: string; aspect: number; durationMs: number };
export type StickerElement = ElementBase & { kind: 'sticker'; icon: string; aspect: number };
/** points: 상자 대비 0~1 [x0, y0, x1, y1, …] / width: 선 굵기, 슬라이드 폭 대비 */
export type StrokeElement = ElementBase & { kind: 'stroke'; points: number[]; color: string; width: number; aspect: number };

export type CanvasElement =
  | TextElement
  | BoundElement
  | ImageElement
  | GifElement
  | VideoElement
  | StickerElement
  | StrokeElement;

export type ElementKind = CanvasElement['kind'];

export interface CanvasDoc {
  background: CanvasBackground;
  /** 배열 순서 = 쌓는 순서 (뒤 → 앞) */
  elements: CanvasElement[];
}

export type SlideDesign = { mode: 'form' } | { mode: 'canvas'; canvas: CanvasDoc };
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/features/canvas/__tests__/model.test.ts`:

```ts
import { defaultContent } from '../../invitation/model';
import {
  addElement,
  canAdd,
  CANVAS_LIMITS,
  checkGif,
  checkVideo,
  duplicateElement,
  fitSlide,
  isGifFile,
  needsSessionUrl,
  palette,
  removeElement,
  reorderElement,
  resolveBind,
  snapCenter,
  snapRotation,
  strokeFromPoints,
  textForPaste,
  updateElement,
} from '../model';
import type { CanvasDoc, CanvasElement } from '../types';

const content = () => defaultContent(new Date(2026, 11, 24)); // 예식일 = 2026-12-31(목)
const text = (id: string): CanvasElement => ({
  id, kind: 'text', text: id, x: 0.5, y: 0.5, w: 0.5, rotation: 0, font: 'sans', color: '#000', size: 0.05, align: 'center',
});
const gif = (id: string): CanvasElement => ({ id, kind: 'gif', uri: 'a.gif', aspect: 1, x: 0.5, y: 0.5, w: 0.3, rotation: 0 });
const doc = (elements: CanvasElement[] = []): CanvasDoc => ({ background: { kind: 'template' }, elements });

describe('resolveBind', () => {
  it('이름이 비면 안내 글자를 흐리게(placeholder) 보여준다', () => {
    const c = content();
    expect(resolveBind('coupleNames', c)).toEqual({ text: '신랑 ♥ 신부', placeholder: true });
    expect(resolveBind('groomName', c)).toEqual({ text: '신랑', placeholder: true });
    expect(resolveBind('venue', c)).toEqual({ text: '예식장', placeholder: true });
  });
  it('폼 값이 있으면 그 값으로 만든다', () => {
    const c = content();
    c.basic.groom.name = '홍길동';
    c.basic.bride.name = '성춘향';
    c.ceremony.time = '14:00';
    expect(resolveBind('coupleNames', c)).toEqual({ text: '홍길동 ♥ 성춘향', placeholder: false });
    expect(resolveBind('date', c).text).toBe('2026 / 12 / 31');
    expect(resolveBind('weekday', c).text).toBe('Thursday');
    expect(resolveBind('datetime', c).text).toBe('2026년 12월 31일 목요일, 오후 2시');
    expect(resolveBind('time', c).text).toBe('오후 2시');
  });
});

describe('canAdd', () => {
  it('30번째까지 넣을 수 있고 31번째는 거부한다 (선 포함)', () => {
    const d29 = doc(Array.from({ length: 29 }, (_, i) => text(`t${i}`)));
    expect(canAdd(d29, 'stroke')).toBeNull();
    const d30 = doc(Array.from({ length: CANVAS_LIMITS.elements }, (_, i) => text(`t${i}`)));
    expect(canAdd(d30, 'stroke')).toBe('elements');
  });
  it('GIF는 3개, 동영상은 1개까지', () => {
    expect(canAdd(doc([gif('a'), gif('b')]), 'gif')).toBeNull();
    expect(canAdd(doc([gif('a'), gif('b'), gif('c')]), 'gif')).toBe('gifs');
    const video: CanvasElement = { id: 'v', kind: 'video', uri: 'v.mp4', aspect: 1, durationMs: 1000, x: 0.5, y: 0.5, w: 0.5, rotation: 0 };
    expect(canAdd(doc([video]), 'video')).toBe('videos');
    expect(canAdd(doc([video]), 'gif')).toBeNull();
  });
});

describe('붙기·맞춤', () => {
  it('가운데 근처면 0.5로 붙고 가이드를 켠다', () => {
    expect(snapCenter(0.51, 0.3)).toEqual({ x: 0.5, y: 0.3, guideX: true, guideY: false });
    expect(snapCenter(0.6, 0.505)).toEqual({ x: 0.6, y: 0.5, guideX: false, guideY: true });
  });
  it('중심은 슬라이드 안으로 제한한다', () => {
    expect(snapCenter(-0.2, 1.4)).toMatchObject({ x: 0, y: 1 });
  });
  it('회전은 90도 배수 5도 이내에서 붙는다', () => {
    expect(snapRotation(3)).toBe(0);
    expect(snapRotation(87)).toBe(90);
    expect(snapRotation(-178)).toBe(-180);
    expect(snapRotation(30)).toBe(30);
  });
  it('fitSlide: 폰·폴드 펼침·PC 모두 9:16 유지, 화면 안에 들어간다', () => {
    expect(fitSlide(360, 640)).toEqual({ width: 360, height: 640 });
    expect(fitSlide(600, 700)).toEqual({ width: 393, height: 698 });
    expect(fitSlide(1280, 800)).toEqual({ width: 450, height: 800 });
  });
});

describe('strokeFromPoints', () => {
  it('점 1개는 선이 아니다', () => {
    expect(strokeFromPoints([{ x: 10, y: 10 }], 360, '#000', 4)).toBeNull();
  });
  it('상자 대비 0~1 좌표와 슬라이드 비율 중심을 만든다', () => {
    const s = strokeFromPoints([{ x: 100, y: 100 }, { x: 200, y: 100 }], 360, '#000', 4)!;
    expect(s.kind).toBe('stroke');
    expect(s.x).toBeCloseTo(150 / 360);
    expect(s.y).toBeCloseTo(100 / 640);
    expect(s.w).toBeCloseTo(104 / 360); // 길이 100 + 굵기 4
    expect(s.width).toBeCloseTo(4 / 360);
    expect(s.points.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('문서 조작', () => {
  it('추가·수정·삭제', () => {
    let d = addElement(doc(), text('a'));
    d = updateElement(d, 'a', { x: 0.2 });
    expect(d.elements[0].x).toBe(0.2);
    expect(removeElement(d, 'a').elements).toEqual([]);
  });
  it('복제는 살짝 비켜서 맨 앞에 넣고 새 id를 준다', () => {
    const { doc: d, id } = duplicateElement(doc([text('a'), text('b')]), 'a');
    expect(d.elements).toHaveLength(3);
    expect(d.elements[2].id).toBe(id);
    expect(id).not.toBe('a');
    expect(d.elements[2].x).toBeCloseTo(0.53);
  });
  it('앞으로/뒤로는 한 칸씩, 끝에서는 그대로', () => {
    const d = doc([text('a'), text('b'), text('c')]);
    expect(reorderElement(d, 'a', 'front').elements.map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(reorderElement(d, 'a', 'back')).toBe(d);
    expect(reorderElement(d, 'c', 'front')).toBe(d);
  });
});

describe('미디어 검사', () => {
  it('GIF 10MB 초과 거부', () => {
    expect(checkGif({ size: 10 * 1024 * 1024 })).toBeNull();
    expect(checkGif({ size: 10 * 1024 * 1024 + 1 })).toBe('size');
  });
  it('동영상: 확장자 → 길이 → 용량 순으로 검사', () => {
    expect(checkVideo({ name: 'a.avi', size: 1, durationMs: 1000 })).toBe('extension');
    expect(checkVideo({ name: 'a.mp4', size: 1, durationMs: 15001 })).toBe('duration');
    expect(checkVideo({ name: 'a.MOV', size: 31 * 1024 * 1024, durationMs: 1000 })).toBe('size');
    expect(checkVideo({ mimeType: 'video/mp4', size: 1, durationMs: 15000 })).toBeNull();
  });
  it('GIF 판별은 이름·MIME·data URI 중 하나로', () => {
    expect(isGifFile({ name: 'a.GIF' })).toBe(true);
    expect(isGifFile({ mimeType: 'image/gif' })).toBe(true);
    expect(isGifFile({ uri: 'data:image/gif;base64,AAA' })).toBe(true);
    expect(isGifFile({ name: 'a.png', mimeType: 'image/png', uri: 'file:///a.png' })).toBe(false);
  });
  it('웹의 GIF·동영상 data URI만 객체 URL로 바꾼다 (저장 용량 보호)', () => {
    expect(needsSessionUrl('gif', 'data:image/gif;base64,AA', 'web')).toBe(true);
    expect(needsSessionUrl('video', 'data:video/mp4;base64,AA', 'web')).toBe(true);
    expect(needsSessionUrl('image', 'data:image/jpeg;base64,AA', 'web')).toBe(false);
    expect(needsSessionUrl('gif', 'file:///a.gif', 'ios')).toBe(false);
  });
});

describe('기타', () => {
  it('팔레트는 템플릿 색 4개 + 기본색, 중복 없이 8개', () => {
    const p = palette({ fg: '#111111', sub: '#777777', accent: '#111111', bg: '#FFFFFF' });
    expect(p).toHaveLength(8);
    expect(new Set(p).size).toBe(8);
    expect(p[0]).toBe('#111111');
  });
  it('붙여넣기 텍스트는 앞뒤 공백 제거 후 100자로 자른다', () => {
    expect(textForPaste('  안녕  ')).toBe('안녕');
    expect(textForPaste('가'.repeat(150))).toHaveLength(100);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx jest src/features/canvas`
Expected: FAIL — `Cannot find module '../model'`

- [ ] **Step 4: 구현**

`src/features/canvas/model.ts`:

```ts
/**
 * 캔버스(직접 꾸미기) 순수 로직 — 제한, 연결 텍스트, 좌표 계산, 문서 조작, 미디어 검사
 * (설계: docs/superpowers/specs/2026-10-16-canvas-cover-and-view-modes-design.md)
 */
import { fonts } from '../../theme';
import { formatKoreanTime, InvitationContent, parseDate, WEEKDAYS_EN, WEEKDAYS_KO } from '../invitation/model';
import type { BindKey, CanvasDoc, CanvasElement, ElementKind, FontKey, StrokeElement } from './types';

// ── 상수 ──────────────────────────────────────────────

/** 슬라이드 높이 ÷ 폭 (9:16) */
export const SLIDE_RATIO = 16 / 9;

const MB = 1024 * 1024;
export const CANVAS_LIMITS = {
  elements: 30,
  gifs: 3,
  videos: 1,
  gifBytes: 10 * MB,
  videoBytes: 30 * MB,
  videoMs: 15_000,
  text: 100,
  history: 50,
} as const;

/** 가운데 붙기 거리(슬라이드 폭 대비), 회전 붙기 각도 */
const SNAP_CENTER = 0.02;
const SNAP_ROTATION = 5;

export const MIN_W = 0.05;
export const MAX_W = 2;

export const VIDEO_EXTENSIONS = ['mp4', 'mov'];

export const CANVAS_FONTS: Record<FontKey, { label: string; family: string }> = {
  sans: { label: '프리텐다드', family: fonts.regular },
  sansBold: { label: '프리텐다드 굵게', family: fonts.semibold },
  serif: { label: '함렛', family: fonts.serif },
  serifBold: { label: '함렛 굵게', family: fonts.serifBold },
};

export const BIND_LABEL: Record<BindKey, string> = {
  groomName: '신랑 이름',
  brideName: '신부 이름',
  coupleNames: '신랑 ♥ 신부',
  date: '예식 날짜',
  weekday: '요일(영문)',
  datetime: '예식 일시',
  time: '예식 시간',
  venue: '예식장명',
};

export type LimitError = 'elements' | 'gifs' | 'videos';
export const LIMIT_MESSAGE: Record<LimitError, string> = {
  elements: '요소는 30개까지 넣을 수 있어요.',
  gifs: 'GIF는 3개까지 넣을 수 있어요.',
  videos: '영상은 1개까지 넣을 수 있어요.',
};

export const newElementId = () => `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── 연결 텍스트 ───────────────────────────────────────

export function resolveBind(bind: BindKey, c: InvitationContent): { text: string; placeholder: boolean } {
  const groom = c.basic.groom.name.trim();
  const bride = c.basic.bride.name.trim();
  const d = parseDate(c.ceremony.date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  switch (bind) {
    case 'groomName':
      return groom ? { text: groom, placeholder: false } : { text: '신랑', placeholder: true };
    case 'brideName':
      return bride ? { text: bride, placeholder: false } : { text: '신부', placeholder: true };
    case 'coupleNames':
      return { text: `${groom || '신랑'} ♥ ${bride || '신부'}`, placeholder: !groom || !bride };
    case 'date':
      return { text: `${y} / ${m} / ${day}`, placeholder: false };
    case 'weekday':
      return { text: WEEKDAYS_EN[d.getDay()], placeholder: false };
    case 'datetime':
      return {
        text: `${y}년 ${m}월 ${day}일 ${WEEKDAYS_KO[d.getDay()]}요일, ${formatKoreanTime(c.ceremony.time)}`,
        placeholder: false,
      };
    case 'time':
      return { text: formatKoreanTime(c.ceremony.time), placeholder: false };
    case 'venue': {
      const venue = c.ceremony.venue.trim();
      return venue ? { text: venue, placeholder: false } : { text: '예식장', placeholder: true };
    }
  }
}

// ── 제한 ──────────────────────────────────────────────

export function canAdd(doc: CanvasDoc, kind: ElementKind): LimitError | null {
  if (doc.elements.length >= CANVAS_LIMITS.elements) return 'elements';
  const count = (k: ElementKind) => doc.elements.filter((e) => e.kind === k).length;
  if (kind === 'gif' && count('gif') >= CANVAS_LIMITS.gifs) return 'gifs';
  if (kind === 'video' && count('video') >= CANVAS_LIMITS.videos) return 'videos';
  return null;
}

// ── 좌표 ──────────────────────────────────────────────

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const clampWidth = (w: number) => Math.min(MAX_W, Math.max(MIN_W, w));

/** 중심을 슬라이드 안으로 제한하고, 가로·세로 가운데 근처면 붙인다 */
export function snapCenter(x: number, y: number) {
  // 세로도 같은 화면 거리만큼만 붙도록 높이 비율로 나눈다
  const guideX = Math.abs(x - 0.5) < SNAP_CENTER;
  const guideY = Math.abs(y - 0.5) < SNAP_CENTER / SLIDE_RATIO;
  return { x: guideX ? 0.5 : clamp01(x), y: guideY ? 0.5 : clamp01(y), guideX, guideY };
}

export function snapRotation(deg: number): number {
  const nearest = Math.round(deg / 90) * 90;
  return Math.abs(deg - nearest) < SNAP_ROTATION ? nearest : deg;
}

/** 주어진 공간에 9:16 슬라이드를 '맞춤'으로 넣은 크기 (정수 px) */
export function fitSlide(availW: number, availH: number) {
  const width = Math.floor(Math.min(availW, availH / SLIDE_RATIO));
  return { width, height: Math.floor(width * SLIDE_RATIO) };
}

/** 펜으로 그린 화면 좌표(px)를 선 요소로 바꾼다 */
export function strokeFromPoints(
  points: { x: number; y: number }[],
  slideW: number,
  color: string,
  widthPx: number,
): StrokeElement | null {
  if (points.length < 2) return null;
  const slideH = slideW * SLIDE_RATIO;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = widthPx / 2;
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const boxW = Math.max(Math.max(...xs) - Math.min(...xs), 1) + widthPx;
  const boxH = Math.max(Math.max(...ys) - Math.min(...ys), 1) + widthPx;
  return {
    id: newElementId(),
    kind: 'stroke',
    x: (left + boxW / 2) / slideW,
    y: (top + boxH / 2) / slideH,
    w: boxW / slideW,
    rotation: 0,
    aspect: boxH / boxW,
    points: points.flatMap((p) => [(p.x - left) / boxW, (p.y - top) / boxH]),
    color,
    width: widthPx / slideW,
  };
}

// ── 문서 조작 (모두 새 객체를 돌려준다) ───────────────

export const addElement = (doc: CanvasDoc, el: CanvasElement): CanvasDoc => ({ ...doc, elements: [...doc.elements, el] });

export const updateElement = (doc: CanvasDoc, id: string, patch: Partial<CanvasElement>): CanvasDoc => ({
  ...doc,
  elements: doc.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)),
});

export const removeElement = (doc: CanvasDoc, id: string): CanvasDoc => ({
  ...doc,
  elements: doc.elements.filter((e) => e.id !== id),
});

export function duplicateElement(doc: CanvasDoc, id: string): { doc: CanvasDoc; id: string } {
  const src = doc.elements.find((e) => e.id === id);
  if (!src) return { doc, id };
  const copy = { ...src, id: newElementId(), x: clamp01(src.x + 0.03), y: clamp01(src.y + 0.03) } as CanvasElement;
  return { doc: addElement(doc, copy), id: copy.id };
}

export function reorderElement(doc: CanvasDoc, id: string, dir: 'front' | 'back'): CanvasDoc {
  const i = doc.elements.findIndex((e) => e.id === id);
  const j = dir === 'front' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= doc.elements.length) return doc;
  const elements = [...doc.elements];
  [elements[i], elements[j]] = [elements[j], elements[i]];
  return { ...doc, elements };
}

// ── 색 ────────────────────────────────────────────────

const EXTRA_COLORS = ['#FFFFFF', '#000000', '#D9607E', '#3E7CB1', '#C9A227', '#5E7D5A', '#8B79B8', '#C0673F'];

/** 템플릿 색(글자·보조·강조·배경) + 기본색으로 중복 없이 8색 */
export function palette(style: { fg: string; sub: string; accent: string; bg: string }): string[] {
  const out: string[] = [];
  for (const c of [style.fg, style.sub, style.accent, style.bg, ...EXTRA_COLORS]) {
    const up = c.toUpperCase();
    if (!out.some((o) => o.toUpperCase() === up)) out.push(c);
    if (out.length === 8) break;
  }
  return out;
}

// ── 미디어 검사 ───────────────────────────────────────

const ext = (name?: string | null) => (name?.split('.').pop() ?? '').toLowerCase();

export function isGifFile(f: { name?: string | null; mimeType?: string | null; uri?: string }): boolean {
  return ext(f.name) === 'gif' || f.mimeType === 'image/gif' || !!f.uri?.startsWith('data:image/gif');
}

export function checkGif(f: { size?: number | null }): 'size' | null {
  return (f.size ?? 0) > CANVAS_LIMITS.gifBytes ? 'size' : null;
}

export function checkVideo(f: {
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
  durationMs?: number | null;
}): 'extension' | 'duration' | 'size' | null {
  const okExt =
    VIDEO_EXTENSIONS.includes(ext(f.name)) || f.mimeType === 'video/mp4' || f.mimeType === 'video/quicktime';
  if (!okExt) return 'extension';
  if ((f.durationMs ?? 0) > CANVAS_LIMITS.videoMs) return 'duration';
  if ((f.size ?? 0) > CANVAS_LIMITS.videoBytes) return 'size';
  return null;
}

/** 웹에서 GIF·동영상을 data URI 로 저장하면 저장 용량 한도를 넘으므로 객체 URL 로 바꾼다 */
export function needsSessionUrl(kind: 'image' | 'gif' | 'video', uri: string, platform: string): boolean {
  return platform === 'web' && kind !== 'image' && uri.startsWith('data:');
}

export const textForPaste = (s: string) => s.trim().slice(0, CANVAS_LIMITS.text);
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest src/features/canvas && npx tsc --noEmit`
Expected: PASS, 타입 오류 0.

- [ ] **Step 6: 커밋**

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 타입과 순수 로직 (연결 텍스트·제한·붙기·맞춤·문서 조작·미디어 검사)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 초대장 모델에 보기 형태·디자인 추가, 표지 프리셋

**Files:**
- Create: `src/features/canvas/preset.ts`
- Modify: `src/data/templates.ts`, `src/features/invitation/view/look.tsx`, `src/features/invitation/model.ts`, `src/features/invitation/editorStore.ts`, `src/services/mock/mockInvitationService.ts`
- Test: `src/features/canvas/__tests__/preset.test.ts`, `src/features/invitation/__tests__/editorStore.test.ts`(추가), `src/services/mock/__tests__/mockInvitationService.test.ts`(있으면 추가, 없으면 생성)

**Interfaces:**
- Consumes: Task 2 타입·`newElementId`
- Produces:
  - `styleFor(themeId, templateId): TemplateStyle` (`src/data/templates.ts`)
  - `coverPreset(style: TemplateStyle): CanvasDoc` (`src/features/canvas/preset.ts`)
  - `Invitation.viewMode: ViewMode`, `Invitation.design: Partial<Record<PageKey, SlideDesign>>`
  - `CANVAS_PAGES: PageKey[]`(= `['cover']`), `normalizeInvitation(inv): Invitation`
  - `createInvitation({ …, viewMode? })`
  - 편집 스토어: `start({ …, viewMode? })`, `setViewMode(mode)`, `startCanvas(page)`, `applyCanvas(page, doc)`, `resetDesign(page)`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/canvas/__tests__/preset.test.ts`:

```ts
import { getTemplates } from '../../../data/templates';
import { CANVAS_LIMITS } from '../model';
import { coverPreset } from '../preset';

describe('coverPreset', () => {
  it('모든 결혼식 템플릿이 연결 텍스트가 든 표지 프리셋을 가진다', () => {
    for (const t of getTemplates('wedding')) {
      const doc = coverPreset(t.style);
      expect(doc.background).toEqual({ kind: 'template' });
      expect(doc.elements.some((e) => e.kind === 'bound' && e.bind === 'coupleNames')).toBe(true);
      expect(doc.elements.length).toBeLessThanOrEqual(CANVAS_LIMITS.elements);
      expect(new Set(doc.elements.map((e) => e.id)).size).toBe(doc.elements.length);
    }
  });
  it('프레임 표지에는 테두리 선이 있다', () => {
    const frame = getTemplates('wedding').find((t) => t.style.cover === 'frame')!;
    expect(coverPreset(frame.style).elements.some((e) => e.kind === 'stroke')).toBe(true);
  });
  it('서체 템플릿은 함렛, 고딕 템플릿은 프리텐다드를 쓴다', () => {
    const serif = getTemplates('wedding').find((t) => t.style.font === 'serif')!;
    const names = coverPreset(serif.style).elements.find((e) => e.kind === 'bound' && e.bind === 'coupleNames');
    expect(names && 'font' in names && names.font.startsWith('serif')).toBe(true);
  });
});
```

`src/features/invitation/__tests__/editorStore.test.ts` 맨 아래 `describe` 블록 안에 추가:

```ts
  it('보기 형태를 지정해 시작하고 바꿀 수 있다', () => {
    useEditor.getState().start({ ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1', viewMode: 'scroll' });
    expect(useEditor.getState().draft?.viewMode).toBe('scroll');
    useEditor.getState().setViewMode('story');
    expect(useEditor.getState().draft?.viewMode).toBe('story');
    expect(useEditor.getState().dirty).toBe(true);
  });

  it('직접 꾸미기 → 프리셋 복사본으로 캔버스 시작, 원래대로 → 형식', () => {
    start();
    useEditor.getState().startCanvas('cover');
    const design = useEditor.getState().draft?.design.cover;
    expect(design?.mode).toBe('canvas');
    if (design?.mode !== 'canvas') throw new Error('캔버스가 아님');
    expect(design.canvas.elements.length).toBeGreaterThan(0);

    const doc = { ...design.canvas, background: { kind: 'color' as const, color: '#000000' } };
    useEditor.getState().applyCanvas('cover', doc);
    const applied = useEditor.getState().draft?.design.cover;
    expect(applied?.mode === 'canvas' && applied.canvas.background).toEqual({ kind: 'color', color: '#000000' });

    useEditor.getState().resetDesign('cover');
    expect(useEditor.getState().draft?.design.cover).toBeUndefined();
  });

  it('캔버스로 바꿔도 기본정보 완료 표시는 그대로다', () => {
    start();
    const before = useEditor.getState().draft?.completed;
    useEditor.getState().startCanvas('cover');
    expect(useEditor.getState().draft?.completed).toEqual(before);
  });
```

`src/services/mock/__tests__/mockInvitationService.test.ts` (먼저 `ls src/services/mock/__tests__`로 있는지 확인. 있으면 이 `it`만 기존 describe에 추가하고 import를 맞춘다):

```ts
import { createInvitation } from '../../../features/invitation/model';
import { createMockInvitationService } from '../mockInvitationService';

const memory = () => {
  const data: Record<string, string> = {};
  return {
    getItem: async (k: string) => data[k] ?? null,
    setItem: async (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: async (k: string) => {
      delete data[k];
    },
  };
};

describe('예전 저장본 보정', () => {
  it('viewMode·design 이 없는 초대장도 스토리형·형식으로 불러온다', async () => {
    const storage = memory();
    const old = createInvitation({ id: 'old', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }) as Partial<
      ReturnType<typeof createInvitation>
    >;
    delete old.viewMode;
    delete old.design;
    await storage.setItem('wuzu.mock.invitations.v1', JSON.stringify({ invitations: [old], guestbook: [] }));
    const service = createMockInvitationService({ delayMs: 0, storage });
    const got = await service.get('old');
    expect(got?.viewMode).toBe('story');
    expect(got?.design).toEqual({});
    const [listed] = await service.list('u1');
    expect(listed.viewMode).toBe('story');
  });
});
```

(`KeyValueStorage` 타입에 `removeItem`이 없으면 그 줄을 지운다 — `src/services/types.ts` 확인.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/canvas/__tests__/preset.test.ts src/features/invitation src/services`
Expected: FAIL — `Cannot find module '../preset'`, `viewMode` 타입/값 없음.

- [ ] **Step 3: 템플릿 스타일 도우미 추가**

`src/data/templates.ts`의 `getTemplate` 아래에 추가:

```ts
/** 템플릿을 찾지 못했을 때 쓰는 기본 룩 */
export const FALLBACK_STYLE: TemplateStyle = {
  bg: '#FFFFFF',
  fg: '#222222',
  sub: '#777777',
  accent: '#D9607E',
  font: 'serif',
  cover: 'date',
};

export function styleFor(themeId: string, templateId: string): TemplateStyle {
  return getTemplate(themeId, templateId)?.style ?? FALLBACK_STYLE;
}
```

`src/features/invitation/view/look.tsx`에서 `FALLBACK` 상수를 지우고 `lookFor`를 다음으로 바꾼다(import에 `styleFor` 추가, `getTemplate`·`TemplateStyle` import는 `TemplateStyle`만 남김):

```ts
export function lookFor(themeId: string, templateId: string): Look {
  const style = styleFor(themeId, templateId);
  const [regular, bold] = templateFontFamily[style.font];
  return { ...style, regular, bold };
}
```

- [ ] **Step 4: 표지 프리셋 작성**

`src/features/canvas/preset.ts`:

```ts
import type { TemplateStyle } from '../../data/templates';
import type { BindKey, CanvasDoc, CanvasElement, FontKey } from './types';

/** 360px 폭 기준 px → 슬라이드 폭 대비 비율 */
const u = (px: number) => px / 360;

/**
 * 템플릿 표지(형식 모드)의 배치. 형식 표지도 이 프리셋을 그대로 그리므로
 * [직접 꾸미기]로 바꿔도 모습이 달라지지 않는다.
 */
export function coverPreset(style: TemplateStyle): CanvasDoc {
  const serif = style.font === 'serif';
  const regular: FontKey = serif ? 'serif' : 'sans';
  const bold: FontKey = serif ? 'serifBold' : 'sansBold';

  const bound = (id: string, bind: BindKey, y: number, px: number, color: string, isBold = false): CanvasElement => ({
    id, kind: 'bound', bind, x: 0.5, y, w: 0.9, rotation: 0, font: isBold ? bold : regular, color, size: u(px), align: 'center',
  });
  const text = (id: string, value: string, y: number, px: number, color: string, isBold = false): CanvasElement => ({
    id, kind: 'text', text: value, x: 0.5, y, w: 0.9, rotation: 0, font: isBold ? bold : regular, color, size: u(px), align: 'center',
  });
  /** 가로 줄 (양 끝 두 점) */
  const rule = (id: string, y: number, lengthPx: number): CanvasElement => ({
    id, kind: 'stroke', x: 0.5, y, w: u(lengthPx), rotation: 0, aspect: 1 / lengthPx,
    points: [0, 0.5, 1, 0.5], color: style.accent, width: u(1),
  });

  if (style.cover === 'names') {
    return {
      background: { kind: 'template' },
      elements: [
        text('preset-label', 'WEDDING INVITATION', 0.37, 12, style.accent),
        bound('preset-names', 'coupleNames', 0.44, 28, style.fg, true),
        rule('preset-rule', 0.5, 32),
        bound('preset-datetime', 'datetime', 0.55, 14, style.sub),
      ],
    };
  }

  const elements: CanvasElement[] = [
    bound('preset-date', 'date', 0.34, 32, style.fg, true),
    bound('preset-weekday', 'weekday', 0.4, 14, style.sub),
    text('preset-heart', '♥', 0.445, 14, style.accent),
    bound('preset-names', 'coupleNames', 0.5, 18, style.fg, true),
    bound('preset-datetime', 'datetime', 0.56, 14, style.sub),
    bound('preset-venue', 'venue', 0.61, 14, style.sub),
  ];
  if (style.cover === 'frame') {
    // 바깥 여백 20px 테두리: 상자 폭 = 1 - 2·(20/360), 높이 = 16/9 - 2·(20/360) (폭 단위)
    const w = 1 - 2 * u(20);
    const h = 16 / 9 - 2 * u(20);
    elements.unshift({
      id: 'preset-frame', kind: 'stroke', x: 0.5, y: 0.5, w, rotation: 0, aspect: h / w,
      points: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], color: style.accent, width: u(1),
    });
  }
  return { background: { kind: 'template' }, elements };
}
```

- [ ] **Step 5: 초대장 모델 수정**

`src/features/invitation/model.ts`:

맨 위 import에 추가:

```ts
import type { SlideDesign, ViewMode } from '../canvas/types';
```

`Invitation` 인터페이스의 `completed` 위에 추가:

```ts
  /** 하객 보기 형태 (제작자가 고른다) */
  viewMode: ViewMode;
  /** 슬라이드별 디자인. 없으면 형식(템플릿 배치) */
  design: Partial<Record<PageKey, SlideDesign>>;
```

상수 영역(`DEFAULT_ENABLED` 아래)에 추가:

```ts
/** [직접 꾸미기]를 열어 둔 페이지 (1차: 표지만) */
export const CANVAS_PAGES: PageKey[] = ['cover'];
```

`createInvitation`의 인자 타입에 `viewMode?: ViewMode;`를 추가하고, 반환 객체의 `completed: {},` 위에 넣는다:

```ts
    viewMode: args.viewMode ?? 'story',
    design: {},
```

`createInvitation` 아래에 추가:

```ts
/** 예전 저장본(보기 형태·디자인 없음)을 지금 모양으로 채운다 */
export function normalizeInvitation(inv: Invitation): Invitation {
  const raw = inv as Partial<Invitation> & Invitation;
  return { ...inv, viewMode: raw.viewMode ?? 'story', design: raw.design ?? {} };
}
```

- [ ] **Step 6: mock 서비스에서 보정**

`src/services/mock/mockInvitationService.ts` import를 `import { Invitation, normalizeInvitation, validateGuestbookEntry } from '../../features/invitation/model';`로 바꾸고, `load()`를 다음으로 바꾼다:

```ts
  async function load(): Promise<Db> {
    const raw = await storage.getItem(DB_KEY);
    const db = raw ? (JSON.parse(raw) as Db) : { invitations: [], guestbook: [] };
    return { ...db, invitations: db.invitations.map(normalizeInvitation) };
  }
```

- [ ] **Step 7: 편집 스토어 수정**

`src/features/invitation/editorStore.ts`:

import를 다음으로 바꾼다:

```ts
import { create } from 'zustand';

import { styleFor } from '../../data/templates';
import { coverPreset } from '../canvas/preset';
import type { CanvasDoc, ViewMode } from '../canvas/types';
import {
  createInvitation,
  Invitation,
  InvitationContent,
  OptionalSection,
  PageKey,
  ReorderablePage,
  SectionKey,
  validateSection,
} from './model';
```

`EditorState`에서 `start` 타입을 `start: (args: { ownerId: string; themeId: string; templateId: string; today?: Date; viewMode?: ViewMode }) => void;`로 바꾸고, `markSaved` 위에 추가:

```ts
  setViewMode: (mode: ViewMode) => void;
  /** [직접 꾸미기]: 템플릿 프리셋 복사본으로 캔버스 시작 */
  startCanvas: (page: PageKey) => void;
  /** 캔버스 편집기 [완료] */
  applyCanvas: (page: PageKey, doc: CanvasDoc) => void;
  /** [템플릿 원래대로]: 형식으로 되돌림 */
  resetDesign: (page: PageKey) => void;
```

`start` 구현을 바꾼다:

```ts
  start: ({ ownerId, themeId, templateId, today, viewMode }) =>
    set({ draft: createInvitation({ id: newId(), ownerId, themeId, templateId, today, viewMode }), dirty: false }),
```

`markSaved` 위에 구현 추가:

```ts
  setViewMode: (mode) => set((s) => (s.draft ? { draft: { ...s.draft, viewMode: mode }, dirty: true } : s)),

  startCanvas: (page) =>
    set((s) => {
      if (!s.draft) return s;
      const preset = coverPreset(styleFor(s.draft.themeId, s.draft.templateId));
      // 프리셋 원본이 바뀌지 않도록 깊은 복사
      const canvas = JSON.parse(JSON.stringify(preset)) as CanvasDoc;
      return { draft: { ...s.draft, design: { ...s.draft.design, [page]: { mode: 'canvas', canvas } } }, dirty: true };
    }),

  applyCanvas: (page, doc) =>
    set((s) =>
      s.draft ? { draft: { ...s.draft, design: { ...s.draft.design, [page]: { mode: 'canvas', canvas: doc } } }, dirty: true } : s,
    ),

  resetDesign: (page) =>
    set((s) => {
      if (!s.draft) return s;
      const { [page]: _removed, ...design } = s.draft.design;
      return { draft: { ...s.draft, design }, dirty: true };
    }),
```

(지금 `startCanvas`는 표지 프리셋만 만든다. 다른 페이지가 열리면 페이지별 프리셋 함수로 나눈다 — 1차 범위 밖.)

- [ ] **Step 8: 다른 곳의 타입 오류 정리**

Run: `npx tsc --noEmit`
Expected: `Invitation`을 직접 만드는 곳(예: 테스트 픽스처)에서 `viewMode`·`design` 누락 오류가 나면 `createInvitation`을 쓰거나 두 필드를 채운다. `InvitationView`의 `Pick` 타입은 Task 6에서 바꾸므로 여기서는 손대지 않는다.

- [ ] **Step 9: 통과 확인**

Run: `npx jest && npx tsc --noEmit`
Expected: 전부 통과.

- [ ] **Step 10: 커밋**

```bash
git add src/data/templates.ts src/features src/services
git commit -m "feat: 초대장에 보기 형태·슬라이드 디자인 추가, 템플릿 표지 프리셋, 예전 저장본 보정

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 캔버스 편집 스토어 (선택·도구·되돌리기)

**Files:**
- Create: `src/features/canvas/canvasStore.ts`
- Test: `src/features/canvas/__tests__/canvasStore.test.ts`

**Interfaces:**
- Consumes: `CanvasDoc`, `CANVAS_LIMITS.history`
- Produces: `useCanvas` (zustand). 상태 `doc: CanvasDoc | null`, `selectedId: string | null`, `tool: CanvasTool`, `past: CanvasDoc[]`, `future: CanvasDoc[]`. 동작 `open(doc)`, `close()`, `select(id | null)`, `setTool(tool)`, `commit(next)`, `undo()`, `redo()`. 타입 `CanvasTool = 'select' | 'pen' | 'eraser'`.

- [ ] **Step 1: 실패하는 테스트**

`src/features/canvas/__tests__/canvasStore.test.ts`:

```ts
import { useCanvas } from '../canvasStore';
import { addElement, removeElement, updateElement } from '../model';
import type { CanvasDoc, CanvasElement } from '../types';

const el = (id: string): CanvasElement => ({
  id, kind: 'text', text: id, x: 0.5, y: 0.5, w: 0.5, rotation: 0, font: 'sans', color: '#000', size: 0.05, align: 'center',
});
const empty: CanvasDoc = { background: { kind: 'template' }, elements: [] };
const s = () => useCanvas.getState();

describe('캔버스 편집 스토어', () => {
  beforeEach(() => s().open(empty));

  it('커밋 한 번 = 되돌리기 1단계, 다시하기로 복구', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().commit(updateElement(s().doc!, 'a', { x: 0.1 }));
    expect(s().past).toHaveLength(2);
    s().undo();
    expect(s().doc!.elements[0].x).toBe(0.5);
    s().redo();
    expect(s().doc!.elements[0].x).toBe(0.1);
  });

  it('새로 커밋하면 다시하기 기록은 비운다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().undo();
    s().commit(addElement(s().doc!, el('b')));
    expect(s().future).toEqual([]);
  });

  it('기록은 최대 50단계', () => {
    for (let i = 0; i < 60; i++) s().commit(addElement(s().doc!, el(`e${i}`)));
    expect(s().past).toHaveLength(50);
  });

  it('같은 문서를 커밋하면 기록하지 않는다', () => {
    s().commit(s().doc!);
    expect(s().past).toHaveLength(0);
  });

  it('되돌리기로 선택 요소가 사라지면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().undo();
    expect(s().selectedId).toBeNull();
  });

  it('삭제 커밋 후 선택 요소가 없으면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().commit(removeElement(s().doc!, 'a'));
    expect(s().selectedId).toBeNull();
  });

  it('도구를 바꾸면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().setTool('pen');
    expect(s().selectedId).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/canvas/__tests__/canvasStore.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/features/canvas/canvasStore.ts`:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/features/canvas && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 편집 스토어 (선택·도구·되돌리기 50단계)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 읽기 전용 캔버스 렌더러와 표지 교체

**Files:**
- Create: `src/features/canvas/render/CanvasSlide.tsx`, `render/ElementView.tsx`, `render/VideoElement.tsx`, `render/BrokenMedia.tsx`, `src/features/invitation/view/CoverSlide.tsx`
- Modify: `src/components/brand/Icon3D.tsx`(아이콘 소스 내보내기), `src/features/invitation/view/InvitationView.tsx`(표지 부분만)
- Delete: `src/features/invitation/view/CoverPage.tsx`

**Interfaces:**
- Consumes: Task 2·3 (`SLIDE_RATIO`, `CANVAS_FONTS`, `resolveBind`, `coverPreset`, `styleFor`)
- Produces:
  - `ICON_SOURCES`, `Icon3DName` (`Icon3D.tsx`에서 export)
  - `CanvasSlide({ doc, content, templateBg, width, renderElement? })` — `renderElement(el, node)`가 있으면 각 요소를 감싼다(편집기용)
  - `ElementView({ el, content, slideW, children? })` — 위치 상자. `children`이 있으면 내용 대신 children을 그림. `ElementContent({ el, content, slideW, onLayout? })` — 종류별 내용
  - `elementHeight(el, slideW)` — 미디어·스티커·선의 px 높이(텍스트는 `null`)
  - `CoverSlide({ invitation, width })` — `invitation: Pick<Invitation, 'themeId' | 'templateId' | 'content' | 'design'>`

- [ ] **Step 1: 아이콘 소스 내보내기**

`src/components/brand/Icon3D.tsx`의 `const SOURCES`를 `export const ICON_SOURCES`로 이름을 바꾸고, 파일 안의 `SOURCES` 참조 2곳(`keyof typeof`, `source={…}`)도 `ICON_SOURCES`로 바꾼다.

- [ ] **Step 2: 실패 미디어 상자**

`src/features/canvas/render/BrokenMedia.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

/** 미디어를 못 불러올 때 (웹 새로고침 후 GIF·동영상 등) */
export function BrokenMedia({ width, height }: { width: number; height: number }) {
  return (
    <View
      style={{ width, height, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel="불러오지 못한 미디어"
    >
      <Ionicons name="image-outline" size={Math.max(16, Math.min(width, height) * 0.3)} color="#8A8A8A" />
    </View>
  );
}
```

- [ ] **Step 3: 동영상 요소**

`src/features/canvas/render/VideoElement.tsx`:

```tsx
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import { BrokenMedia } from './BrokenMedia';

/** 소리 없이 자동 반복 재생 (하객 화면에는 BGM 이 따로 있다) */
export function VideoElement({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  if (status === 'error') return <BrokenMedia width={width} height={height} />;
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
      {...({ playsInline: true } as object)}
    />
  );
}
```

(`useEvent`의 import 경로는 `node_modules/expo-video` 타입·문서 예제를 보고 맞춘다. SDK 57 문서 예제는 `import { useEvent } from 'expo'`.)

- [ ] **Step 4: 요소 렌더러**

`src/features/canvas/render/ElementView.tsx`:

```tsx
import { Image } from 'expo-image';
import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ICON_SOURCES, Icon3DName } from '../../../components/brand/Icon3D';
import type { InvitationContent } from '../../invitation/model';
import { CANVAS_FONTS, resolveBind, SLIDE_RATIO } from '../model';
import type { CanvasElement } from '../types';
import { BrokenMedia } from './BrokenMedia';
import { VideoElement } from './VideoElement';

/** 미디어·스티커·선의 높이(px). 텍스트는 글자 수에 따라 정해지므로 null */
export function elementHeight(el: CanvasElement, slideW: number): number | null {
  return el.kind === 'text' || el.kind === 'bound' ? null : el.w * slideW * el.aspect;
}

const SHAPE_RADIUS = { rect: 0, rounded: 0.08, circle: 0.5 } as const;

/** 요소 종류별 내용 (위치는 ElementView 가 정한다) */
export function ElementContent({
  el,
  content,
  slideW,
  onLayout,
}: {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const [broken, setBroken] = useState(false);
  const width = el.w * slideW;
  const height = elementHeight(el, slideW) ?? 0;

  if (el.kind === 'text' || el.kind === 'bound') {
    const resolved = el.kind === 'bound' ? resolveBind(el.bind, content) : { text: el.text, placeholder: false };
    const fontSize = el.size * slideW;
    return (
      <Text
        onLayout={onLayout}
        style={{
          width,
          fontFamily: CANVAS_FONTS[el.font].family,
          fontSize,
          lineHeight: Math.round(fontSize * 1.5),
          color: el.color,
          textAlign: el.align,
          opacity: resolved.placeholder ? 0.45 : 1,
        }}
      >
        {resolved.text}
      </Text>
    );
  }

  let node: ReactNode;
  if (broken) {
    node = <BrokenMedia width={width} height={height} />;
  } else if (el.kind === 'image' || el.kind === 'gif') {
    const radius = el.kind === 'image' ? SHAPE_RADIUS[el.shape] * Math.min(width, height) : 0;
    node = (
      <Image
        source={{ uri: el.uri }}
        style={{ width, height, borderRadius: radius }}
        contentFit="cover"
        autoplay
        onError={() => setBroken(true)}
      />
    );
  } else if (el.kind === 'video') {
    node = <VideoElement uri={el.uri} width={width} height={height} />;
  } else if (el.kind === 'sticker') {
    const source = ICON_SOURCES[el.icon as Icon3DName];
    node = source ? (
      <Image source={source} style={{ width, height }} contentFit="contain" />
    ) : (
      <BrokenMedia width={width} height={height} />
    );
  } else {
    // 선: 상자 대비 좌표를 viewBox(폭 1) 에 그려서 크기를 바꾸면 굵기도 같이 바뀐다
    const d = el.points.reduce(
      (acc, v, i) => (i % 2 === 0 ? `${acc}${i === 0 ? 'M' : ' L'}${v} ` : `${acc}${v * el.aspect}`),
      '',
    );
    node = (
      <Svg width={width} height={height} viewBox={`0 0 1 ${el.aspect}`} style={{ overflow: 'visible' }}>
        <Path
          d={d}
          stroke={el.color}
          strokeWidth={el.width / el.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }
  return (
    <View onLayout={onLayout} style={{ width, height }}>
      {node}
    </View>
  );
}

/**
 * 위치 상자: 높이 0 인 줄을 요소 중심 y 에 두고 내용을 세로 가운데로 넘치게 둔다.
 * 그래서 텍스트처럼 높이를 모르는 요소도 중심 좌표로 놓이고, 회전도 중심 기준이 된다.
 */
export function ElementView({
  el,
  content,
  slideW,
  children,
}: {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  children?: ReactNode;
}) {
  const width = el.w * slideW;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: el.x * slideW - width / 2,
        top: el.y * slideW * SLIDE_RATIO,
        width,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        transform: [{ rotate: `${el.rotation}deg` }],
      }}
    >
      {children ?? <ElementContent el={el} content={content} slideW={slideW} />}
    </View>
  );
}
```

- [ ] **Step 5: 슬라이드 렌더러**

`src/features/canvas/render/CanvasSlide.tsx`:

```tsx
import { Image } from 'expo-image';
import { Fragment, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { InvitationContent } from '../../invitation/model';
import { SLIDE_RATIO } from '../model';
import type { CanvasDoc, CanvasElement } from '../types';
import { ElementView } from './ElementView';

interface Props {
  doc: CanvasDoc;
  content: InvitationContent;
  /** 배경이 '템플릿 기본'일 때 색 */
  templateBg: string;
  width: number;
  /** 편집기: 각 요소를 제스처 래퍼로 감싼다 */
  renderElement?: (el: CanvasElement) => ReactNode;
  /** 편집기: 요소 위에 덮는 층 (가이드선·펜) */
  overlay?: ReactNode;
}

/** 9:16 캔버스 한 장 — 형식 표지·캔버스 표지·편집기·하객 보기가 같이 쓴다 */
export function CanvasSlide({ doc, content, templateBg, width, renderElement, overlay }: Props) {
  const height = Math.round(width * SLIDE_RATIO);
  const bg = doc.background;
  return (
    <View style={[styles.slide, { width, height, backgroundColor: bg.kind === 'color' ? bg.color : templateBg }]}>
      {bg.kind === 'image' && <Image source={{ uri: bg.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {doc.elements.map((el) => (
        <Fragment key={el.id}>
          {renderElement ? renderElement(el) : <ElementView el={el} content={content} slideW={width} />}
        </Fragment>
      ))}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { overflow: 'hidden' },
});
```

- [ ] **Step 6: 초대장 표지 슬라이드**

`src/features/invitation/view/CoverSlide.tsx`:

```tsx
import { styleFor } from '../../../data/templates';
import { coverPreset } from '../../canvas/preset';
import { CanvasSlide } from '../../canvas/render/CanvasSlide';
import type { Invitation } from '../model';

/** 표지: 캔버스로 꾸몄으면 그 문서, 아니면 템플릿 프리셋 */
export function CoverSlide({
  invitation,
  width,
}: {
  invitation: Pick<Invitation, 'themeId' | 'templateId' | 'content' | 'design'>;
  width: number;
}) {
  const style = styleFor(invitation.themeId, invitation.templateId);
  const design = invitation.design.cover;
  const doc = design?.mode === 'canvas' ? design.canvas : coverPreset(style);
  return <CanvasSlide doc={doc} content={invitation.content} templateBg={style.bg} width={width} />;
}
```

- [ ] **Step 7: 기존 보기에서 표지 교체 (임시, Task 6에서 보기 전체를 다시 짠다)**

`src/features/invitation/view/InvitationView.tsx`:
- `import { CoverPage } from './CoverPage';` 지우고 `import { useWindowDimensions } from 'react-native';`·`import { CoverSlide } from './CoverSlide';` 추가.
- `Props.invitation` 타입을 `Pick<Invitation, 'themeId' | 'templateId' | 'content' | 'enabled' | 'order' | 'design'>`로.
- 컴포넌트 첫 줄에 `const { width } = useWindowDimensions();` 추가, `{page === 'cover' && <CoverPage content={content} />}`를 `{page === 'cover' && <CoverSlide invitation={invitation} width={Math.min(width, 480)} />}`로.

`src/features/invitation/view/CoverPage.tsx` 삭제: `git rm src/features/invitation/view/CoverPage.tsx`

- [ ] **Step 8: 확인**

Run: `npx tsc --noEmit && npx jest`
Expected: 오류 0, 전부 통과. (화면 확인은 Task 6 이후 한 번에 — 서버는 사용자가 원할 때만 켠다.)

- [ ] **Step 9: 커밋**

```bash
git add -A src/features src/components
git commit -m "feat: 읽기 전용 캔버스 렌더러, 표지를 템플릿 프리셋 캔버스로 교체

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 하객 보기 — 스토리형·스크롤형·반응형

**Files:**
- Create: `src/features/invitation/view/PageContent.tsx`, `view/FormSlide.tsx`, `view/ScrollInvitation.tsx`, `view/StoryInvitation.tsx`
- Modify: `src/features/invitation/view/InvitationView.tsx`(전체), `src/app/invite/[id].tsx`

**Interfaces:**
- Consumes: `CoverSlide`, `fitSlide`, `pageOrder`, `lookFor`, `LookProvider`, 기존 페이지 컴포넌트
- Produces:
  - `type ViewInvitation = Pick<Invitation, 'themeId' | 'templateId' | 'content' | 'enabled' | 'order' | 'design' | 'viewMode'>`
  - `GuestbookHandlers = { guestbook?: GuestbookEntry[]; onGuestbookWrite?: () => void; onGuestbookAll?: () => void }`
  - `PageContent({ page, invitation, ...GuestbookHandlers })` — 표지 외 페이지
  - `FormSlide({ width, height, background, children })`
  - `InvitationView({ invitation, mode?, showBgm?, ...GuestbookHandlers })` — `mode` 기본값 `invitation.viewMode`. 스토리형은 부모가 높이를 정해야 한다(`flex: 1`).
  - `StoryInvitation`, `ScrollInvitation` 같은 props

- [ ] **Step 1: 페이지 내용 분리**

`src/features/invitation/view/PageContent.tsx`:

```tsx
import type { GuestbookEntry } from '../../../services/types';
import type { Invitation, PageKey } from '../model';
import { AccountPage } from './AccountPage';
import { CeremonyPage } from './CeremonyPage';
import { EndingPage } from './EndingPage';
import { GalleryPage } from './GalleryPage';
import { GreetingPage } from './GreetingPage';
import { GuestbookPage } from './GuestbookPage';

export type ViewInvitation = Pick<
  Invitation,
  'themeId' | 'templateId' | 'content' | 'enabled' | 'order' | 'design' | 'viewMode'
>;

export interface GuestbookHandlers {
  guestbook?: GuestbookEntry[];
  onGuestbookWrite?: () => void;
  onGuestbookAll?: () => void;
}

/** 표지 외 형식 페이지 하나 */
export function PageContent({
  page,
  invitation,
  guestbook = [],
  onGuestbookWrite,
  onGuestbookAll,
}: { page: Exclude<PageKey, 'cover'>; invitation: ViewInvitation } & GuestbookHandlers) {
  const { content } = invitation;
  switch (page) {
    case 'greeting':
      return <GreetingPage content={content} />;
    case 'gallery':
      return <GalleryPage gallery={content.gallery} />;
    case 'ceremony':
      return <CeremonyPage ceremony={content.ceremony} />;
    case 'account':
      return <AccountPage account={content.account} basic={content.basic} />;
    case 'guestbook':
      return (
        <GuestbookPage settings={content.guestbook} entries={guestbook} onWrite={onGuestbookWrite} onViewAll={onGuestbookAll} />
      );
    case 'ending':
      return <EndingPage ending={content.ending} />;
  }
}
```

- [ ] **Step 2: 형식 슬라이드 칸**

`src/features/invitation/view/FormSlide.tsx`:

```tsx
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** 형식 페이지를 9:16 칸에 담는다. 내용이 넘치면(방명록·계좌·그리드 갤러리) 칸 안에서 세로 스크롤 */
export function FormSlide({
  width,
  height,
  background,
  children,
}: {
  width: number;
  height: number;
  background: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.slide, { width, height, backgroundColor: background }]}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { overflow: 'hidden' },
  content: { flexGrow: 1, justifyContent: 'center' },
});
```

- [ ] **Step 3: 스크롤형**

`src/features/invitation/view/ScrollInvitation.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { pageOrder } from '../model';
import { CoverSlide } from './CoverSlide';
import { useLook } from './look';
import { GuestbookHandlers, PageContent, ViewInvitation } from './PageContent';

/** 본문 최대 폭 — 폴드 펼침·태블릿·PC 에서는 가운데 칼럼으로 */
export const SCROLL_MAX_WIDTH = 480;

/** 스크롤형: 9:16 표지 + 나머지 섹션을 세로로 이어 붙인다 */
export function ScrollInvitation({ invitation, ...handlers }: { invitation: ViewInvitation } & GuestbookHandlers) {
  const look = useLook();
  const [width, setWidth] = useState(0);
  const pages = pageOrder(invitation.enabled, invitation.order);
  return (
    <View style={[styles.outer, { backgroundColor: look.bg }]}>
      <View style={styles.column} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {pages.map((page) =>
          page === 'cover' ? (
            width > 0 && <CoverSlide key={page} invitation={invitation} width={width} />
          ) : (
            <PageContent key={page} page={page} invitation={invitation} {...handlers} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center' },
  column: { width: '100%', maxWidth: SCROLL_MAX_WIDTH },
});
```

- [ ] **Step 4: 스토리형**

`src/features/invitation/view/StoryInvitation.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fitSlide } from '../../canvas/model';
import { pageOrder } from '../model';
import { CoverSlide } from './CoverSlide';
import { FormSlide } from './FormSlide';
import { useLook } from './look';
import { GuestbookHandlers, PageContent, ViewInvitation } from './PageContent';

/** 이 폭 이상(폴드 펼침·태블릿·PC)에서는 좌우 화살표 버튼을 보인다 */
const WIDE = 600;

/**
 * 스토리형: 9:16 슬라이드를 한 장씩. 좌우로 밀거나 슬라이드 좌·우 1/3 을 눌러 넘긴다.
 * 슬라이드 안 버튼·스크롤은 각자 터치를 가져가므로 넘김이 일어나지 않는다.
 */
export function StoryInvitation({ invitation, ...handlers }: { invitation: ViewInvitation } & GuestbookHandlers) {
  const look = useLook();
  const pages = pageOrder(invitation.enabled, invitation.order);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const slide = fitSlide(box.width, box.height);

  const go = (next: number) => {
    const i = Math.max(0, Math.min(pages.length - 1, next));
    setIndex(i);
    scroller.current?.scrollTo({ x: i * box.width, animated: true });
  };

  // 폴드를 접고 펴서 폭이 바뀌면 보던 장으로 다시 맞춘다
  useEffect(() => {
    scroller.current?.scrollTo({ x: index * box.width, animated: false });
    // index 는 넘길 때마다 바뀌므로 폭이 바뀔 때만 맞춘다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.width]);

  // 웹 키보드 ←/→
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onTap = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    if (x < slide.width / 3) go(index - 1);
    else if (x > (slide.width * 2) / 3) go(index + 1);
  };

  return (
    <View
      style={[styles.flex, { backgroundColor: look.bg }]}
      onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
    >
      {box.width > 0 && (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / box.width))}
        >
          {pages.map((page) => (
            <View key={page} style={[styles.page, { width: box.width, height: box.height }]}>
              <Pressable onPress={onTap} accessible={false}>
                {page === 'cover' ? (
                  <CoverSlide invitation={invitation} width={slide.width} />
                ) : (
                  <FormSlide width={slide.width} height={slide.height} background={look.bg}>
                    <PageContent page={page} invitation={invitation} {...handlers} />
                  </FormSlide>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 상단 페이지 막대 */}
      <View style={[styles.bars, { width: slide.width, left: (box.width - slide.width) / 2 }]} pointerEvents="none">
        {pages.map((p, i) => (
          <View key={p} style={[styles.bar, { backgroundColor: look.fg, opacity: i <= index ? 0.8 : 0.2 }]} />
        ))}
      </View>

      {box.width >= WIDE && (
        <>
          {index > 0 && (
            <Pressable style={[styles.arrow, { left: 16 }]} onPress={() => go(index - 1)} accessibilityLabel="이전 장">
              <Ionicons name="chevron-back" size={24} color="#111111" />
            </Pressable>
          )}
          {index < pages.length - 1 && (
            <Pressable style={[styles.arrow, { right: 16 }]} onPress={() => go(index + 1)} accessibilityLabel="다음 장">
              <Ionicons name="chevron-forward" size={24} color="#111111" />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  bars: { position: 'absolute', top: 10, flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  bar: { flex: 1, height: 2, borderRadius: 1 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5: 보기 진입점 교체**

`src/features/invitation/view/InvitationView.tsx` 전체:

```tsx
import { View } from 'react-native';

import type { ViewMode } from '../../canvas/types';
import { BgmButton } from './BgmButton';
import { lookFor, LookProvider } from './look';
import { GuestbookHandlers, ViewInvitation } from './PageContent';
import { ScrollInvitation } from './ScrollInvitation';
import { StoryInvitation } from './StoryInvitation';

interface Props extends GuestbookHandlers {
  invitation: ViewInvitation;
  /** 없으면 초대장에 저장된 보기 형태 */
  mode?: ViewMode;
  /** 편집 화면 미리보기에서는 BGM 버튼을 숨긴다 */
  showBgm?: boolean;
}

/**
 * 초대장 전체 — 템플릿 미리보기·편집 미리보기·저장본 보기가 같이 쓴다.
 * 스토리형은 부모가 높이를 정해야 한다 (스크롤 안에 넣지 않는다).
 */
export function InvitationView({ invitation, mode, showBgm = true, ...handlers }: Props) {
  const look = lookFor(invitation.themeId, invitation.templateId);
  const { content, enabled } = invitation;
  const story = (mode ?? invitation.viewMode) === 'story';
  return (
    <LookProvider look={look}>
      <View style={story ? { flex: 1 } : undefined}>
        {story ? (
          <StoryInvitation invitation={invitation} {...handlers} />
        ) : (
          <ScrollInvitation invitation={invitation} {...handlers} />
        )}
        {showBgm && enabled.bgm && content.bgm.uri && <BgmButton bgm={content.bgm} />}
      </View>
    </LookProvider>
  );
}
```

(`BgmButton`이 `position: 'absolute'`인지 확인한다. 아니면 감싸는 `View`에 `position: 'absolute', top: 12, right: 12, zIndex: 10` 스타일을 준다. 이전엔 목록 맨 앞에 있었으므로 스크롤형에서도 위치가 같도록 맞춘다.)

- [ ] **Step 6: 저장본 보기 화면**

`src/app/invite/[id].tsx` 마지막 `return (...)`의 `<Screen …>`을 다음처럼 바꾼다:

```tsx
  const story = invitation.viewMode === 'story';
  const look = lookFor(invitation.themeId, invitation.templateId);

  return (
    <Screen
      header={<Header title={invitation.name || '초대장'} />}
      background={look.bg}
      // 스토리형은 화면 높이를 꽉 채워 넘기고, 스크롤형만 세로 스크롤
      scroll={!story}
      contentStyle={story ? { flex: 1 } : undefined}
    >
```

그리고 import에 `import { lookFor } from '../../features/invitation/view/look';` 추가. 나머지(배너·InvitationView·GuestbookModals)는 그대로 둔다.

- [ ] **Step 7: 다른 사용처 컴파일**

Run: `npx tsc --noEmit`
Expected: `compose.tsx`·템플릿 미리보기에서 `InvitationView`를 쓰는 곳이 `viewMode`가 있는 `Invitation`을 넘기므로 통과해야 한다. 템플릿 미리보기는 지금 `Screen`(스크롤) 안이라 스토리형이 높이 0이 될 수 있다 — Task 7에서 고친다. 임시로 `mode="scroll"`을 넘겨 둔다(`src/app/create/[theme]/[templateId].tsx`의 `<InvitationView` 에 `mode="scroll"` 추가). `compose.tsx`의 미리보기도 `mode="scroll"`을 넘긴다(Task 8에서 교체).

- [ ] **Step 8: 테스트**

Run: `npx jest && npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 9: 커밋**

```bash
git add -A src
git commit -m "feat: 하객 보기 스토리형·스크롤형, 폴드·태블릿·PC 반응형

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 템플릿 미리보기 — 보기 전환과 스타일 선택

**Files:**
- Create: `src/features/invitation/editor/ViewModePicker.tsx`
- Modify: `src/app/create/[theme]/[templateId].tsx`, `src/features/create/useRequireLoginToCreate.tsx`

**Interfaces:**
- Consumes: `useEditor.start({ …, viewMode })`, `InvitationView({ mode })`
- Produces:
  - `ViewModeChips({ value, onChange })` — 상단 전환 칩
  - `ViewModeModal({ visible, initial, confirmLabel, onConfirm(mode), onCancel })` — 두 카드 선택 모달
  - `useRequireLoginToCreate().start(themeId, templateId, templateName, viewMode?)`

- [ ] **Step 1: 선택 컴포넌트**

`src/features/invitation/editor/ViewModePicker.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import type { ViewMode } from '../../canvas/types';

const OPTIONS: { value: ViewMode; label: string; body: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'story', label: '스토리형', body: '한 장씩 넘겨 보는 초대장', icon: 'albums-outline' },
  { value: 'scroll', label: '스크롤형', body: '아래로 이어서 보는 초대장', icon: 'reorder-four-outline' },
];

/** 미리보기 상단 [스토리형][스크롤형] 전환 칩 */
export function ViewModeChips({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <View style={styles.chips}>
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Txt variant="caption" weight={on ? 'semibold' : 'regular'} color={on ? colors.canvas : colors.label}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 스타일 선택 모달: 두 카드 중 하나 고르기 */
export function ViewModeModal({
  visible,
  initial,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initial: ViewMode;
  confirmLabel: string;
  onConfirm: (mode: ViewMode) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState(initial);
  useEffect(() => {
    if (visible) setMode(initial);
  }, [visible, initial]);

  return (
    <AppModal
      visible={visible}
      title="어떤 형태로 만들까요?"
      onDismiss={onCancel}
      actions={[
        { label: '취소', variant: 'outline', onPress: onCancel },
        { label: confirmLabel, onPress: () => onConfirm(mode) },
      ]}
    >
      <View style={styles.cards}>
        {OPTIONS.map((o) => {
          const on = o.value === mode;
          return (
            <Pressable
              key={o.value}
              onPress={() => setMode(o.value)}
              style={[styles.card, on && styles.cardOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={o.icon} size={28} color={on ? colors.inkSoft : colors.faint} />
              <Txt variant="bodyStrong">{o.label}</Txt>
              <Txt variant="tiny" color={colors.muted} align="center">
                {o.body}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="tiny" color={colors.faint} align="center">
        만드는 중에도 바꿀 수 있어요.
      </Txt>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'center', paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cards: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardOn: { borderColor: colors.inkSoft, backgroundColor: colors.surface },
});
```

(`Txt`의 `variant` 값 `bodyStrong`·`caption`·`tiny`는 이미 쓰이는 값이다. `Ionicons.glyphMap` 타입 접근이 안 되면 `icon`을 `'albums-outline' | 'reorder-four-outline'` 유니온으로 둔다.)

- [ ] **Step 2: 제작 시작에 보기 형태 전달**

`src/features/create/useRequireLoginToCreate.tsx`의 `start`를 바꾼다(import에 `import type { ViewMode } from '../canvas/types';` 추가):

```ts
  const start = (themeId: string, templateId: string, templateName: string, viewMode: ViewMode = 'story') => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!EDITABLE_THEMES.includes(themeId)) {
      setNotice(templateName);
      return;
    }
    useEditor.getState().start({ ownerId: user.id, themeId, templateId, viewMode });
    router.push('/create/editor/options');
  };
```

훅의 반환값에 `canEdit: (themeId: string) => !!user && EDITABLE_THEMES.includes(themeId)`도 추가한다.

- [ ] **Step 3: 미리보기 화면**

`src/app/create/[theme]/[templateId].tsx`:
- import 추가: `import { View } from 'react-native';`, `import type { ViewMode } from '../../../features/canvas/types';`, `import { ViewModeChips, ViewModeModal } from '../../../features/invitation/editor/ViewModePicker';`
- `const { start, modal } = useRequireLoginToCreate();` → `const { start, canEdit, modal } = useRequireLoginToCreate();`
- 상태 추가: `const [mode, setMode] = useState<ViewMode>('story');`, `const [picking, setPicking] = useState(false);`
- `wedding` 여부: `const wedding = themeId === 'wedding';`
- `<Screen …>` 속성을 바꾼다:

```tsx
    <Screen
      header={<Header title="템플릿 미리보기" />}
      background={template.style.bg}
      // 스토리형 미리보기는 화면 높이를 채워 넘긴다
      scroll={!wedding || mode === 'scroll'}
      contentStyle={wedding && mode === 'story' ? { flex: 1 } : undefined}
      footer={
        <BottomCTA>
          <Button
            label="이 템플릿으로 만들기"
            onPress={() => (canEdit(themeId) ? setPicking(true) : start(themeId, templateId, template.name))}
          />
        </BottomCTA>
      }
    >
      {wedding ? (
        <>
          <View style={{ backgroundColor: template.style.bg }}>
            <ViewModeChips value={mode} onChange={setMode} />
          </View>
          <InvitationView
            invitation={sample}
            mode={mode}
            guestbook={entries}
            onGuestbookWrite={() => setGuestbook('write')}
            onGuestbookAll={() => setGuestbook('all')}
          />
        </>
      ) : (
        <TemplatePreview template={template} />
      )}
```

- `{modal}` 위에 추가:

```tsx
      <ViewModeModal
        visible={picking}
        initial={mode}
        confirmLabel="시작하기"
        onCancel={() => setPicking(false)}
        onConfirm={(m) => {
          setPicking(false);
          start(themeId, templateId, template.name, m);
        }}
      />
```

(이전 Task 6 Step 7에서 넣은 임시 `mode="scroll"`은 이 코드로 대체된다.)

- [ ] **Step 4: 확인**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: 템플릿 미리보기에서 스토리형/스크롤형 전환·선택 후 제작 시작

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Step5 재구성 — 슬라이드 무대·하단 독바·꾸미기 버튼·미리보기

**Files:**
- Create: `src/features/invitation/editor/pages.ts`, `editor/DockBar.tsx`, `editor/SlideStage.tsx`, `src/app/create/editor/preview.tsx`
- Modify: `src/app/create/editor/compose.tsx`(전체), `src/features/invitation/editor/SectionSheet.tsx`(`SectionTabBar` 삭제)
- Test: `src/features/invitation/__tests__/pages.test.ts`

**Interfaces:**
- Consumes: `pageOrder`, `CANVAS_PAGES`, `CoverSlide`, `FormSlide`, `PageContent`, `fitSlide`, `ViewModeModal`, 편집 스토어 `startCanvas`·`resetDesign`·`setViewMode`
- Produces:
  - `PAGE_SECTION: Record<PageKey, SectionKey>`, `type DockItem = { kind: 'page'; page: PageKey; section: SectionKey } | { kind: 'info'; section: 'basic' | 'bgm' }`, `dockItems(inv): DockItem[]`, `itemDone(inv, item): boolean`
  - `DockBar({ items, active, invitation, onSelect })`
  - `SlideStage({ invitation, pages, index, onIndexChange, onEdit })`
  - compose 안에서 캔버스 편집기를 띄울 자리: `canvasPage` 상태 — Task 9의 `CanvasEditor`를 여기서 렌더한다(이 작업에서는 `null`이면 무대, 값이 있으면 Task 9 전까지 `[직접 꾸미기]`가 `startCanvas`만 부르고 무대에 캔버스 표지를 보여준다)

- [ ] **Step 1: 실패하는 테스트**

`src/features/invitation/__tests__/pages.test.ts`:

```ts
import { dockItems, itemDone, PAGE_SECTION } from '../editor/pages';
import { createInvitation } from '../model';

const inv = () => createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' });

describe('독바 항목', () => {
  it('페이지 순서대로 + 끝에 기본정보, BGM 은 켰을 때만', () => {
    const i = inv();
    expect(dockItems(i).map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
      'cover', 'greeting', 'gallery', 'ceremony', 'guestbook', 'account', 'ending', 'info:basic',
    ]);
    i.enabled.bgm = true;
    i.enabled.gallery = false;
    expect(dockItems(i).map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
      'cover', 'greeting', 'ceremony', 'guestbook', 'account', 'ending', 'info:basic', 'info:bgm',
    ]);
  });
  it('표지는 기본정보 섹션에 묶인다', () => {
    expect(PAGE_SECTION.cover).toBe('basic');
  });
  it('완료 여부는 연결된 섹션의 ✓ 확인으로 정한다', () => {
    const i = inv();
    const cover = dockItems(i)[0];
    expect(itemDone(i, cover)).toBe(false);
    i.completed.basic = true;
    expect(itemDone(i, cover)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/features/invitation/__tests__/pages.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/features/invitation/editor/pages.ts`:

```ts
import { Invitation, PageKey, pageOrder, SectionKey } from '../model';

/** 슬라이드를 눌렀을 때 여는 입력 시트 */
export const PAGE_SECTION: Record<PageKey, SectionKey> = {
  cover: 'basic',
  greeting: 'greeting',
  gallery: 'gallery',
  ceremony: 'ceremony',
  guestbook: 'guestbook',
  account: 'account',
  ending: 'ending',
};

export type DockItem =
  | { kind: 'page'; page: PageKey; section: SectionKey }
  | { kind: 'info'; section: 'basic' | 'bgm' };

/** 하단 독바: 페이지 썸네일(순서대로) + 페이지가 없는 정보 칩 */
export function dockItems(inv: Pick<Invitation, 'enabled' | 'order'>): DockItem[] {
  const pages: DockItem[] = pageOrder(inv.enabled, inv.order).map((page) => ({ kind: 'page', page, section: PAGE_SECTION[page] }));
  const info: DockItem[] = [{ kind: 'info', section: 'basic' }];
  if (inv.enabled.bgm) info.push({ kind: 'info', section: 'bgm' });
  return [...pages, ...info];
}

export const itemDone = (inv: Pick<Invitation, 'completed'>, item: DockItem) => !!inv.completed[item.section];
```

`src/features/invitation/editor/DockBar.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { Invitation, PAGE_LABEL, SECTION_LABEL } from '../model';
import { DockItem, itemDone } from './pages';

const THUMB_W = 44;

/** 하단 독바: 슬라이드 썸네일 + 정보 칩. 미완료는 빨간 점 */
export function DockBar({
  items,
  active,
  invitation,
  onSelect,
}: {
  items: DockItem[];
  /** 선택된 항목 인덱스 */
  active: number;
  invitation: Invitation;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item, i) => {
          const on = i === active;
          const done = itemDone(invitation, item);
          const label = item.kind === 'page' ? PAGE_LABEL[item.page] : SECTION_LABEL[item.section];
          return (
            <Pressable
              key={item.kind === 'page' ? item.page : `info-${item.section}`}
              onPress={() => onSelect(i)}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${done ? '작성 완료' : '작성 필요'}`}
            >
              <View style={[item.kind === 'page' ? styles.thumb : styles.chip, on && styles.on]}>
                {item.kind === 'info' && (
                  <Ionicons name={item.section === 'bgm' ? 'musical-notes-outline' : 'person-outline'} size={18} color={colors.label} />
                )}
                {!done && <View style={styles.dot} />}
              </View>
              <Txt variant="tiny" color={on ? colors.inkSoft : colors.muted} weight={on ? 'semibold' : 'regular'}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.canvas },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  item: { alignItems: 'center', gap: 4, width: 56 },
  thumb: {
    width: THUMB_W,
    height: Math.round((THUMB_W * 16) / 9),
    borderRadius: radius.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chip: {
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { borderColor: colors.inkSoft, borderWidth: 2 },
  dot: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
});
```

(썸네일은 1차에서는 빈 9:16 칸이다. 작은 실제 미리보기는 성능 확인 후 보완 목록에 둔다 — 독바에 슬라이드를 7장 축소 렌더하면 동영상 플레이어가 여러 개 생긴다.)

`src/features/invitation/editor/SlideStage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fitSlide } from '../../canvas/model';
import { Invitation, PageKey } from '../model';
import { CoverSlide } from '../view/CoverSlide';
import { FormSlide } from '../view/FormSlide';
import { lookFor, LookProvider } from '../view/look';
import { PageContent } from '../view/PageContent';

/** Step5 가운데: 현재 슬라이드 하나를 9:16 으로 크게. 좌우로 밀어도 이동 */
export function SlideStage({
  invitation,
  pages,
  index,
  onIndexChange,
  onEdit,
}: {
  invitation: Invitation;
  pages: PageKey[];
  /** 페이지 인덱스 (정보 칩이 선택됐으면 -1) */
  index: number;
  onIndexChange: (i: number) => void;
  /** 슬라이드를 누르면 입력 시트 열기 */
  onEdit: (page: PageKey) => void;
}) {
  const look = lookFor(invitation.themeId, invitation.templateId);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const scroller = useRef<ScrollView>(null);
  // 위아래 여백 16 씩 남기고 맞춘다
  const slide = fitSlide(box.width - 32, box.height - 32);

  useEffect(() => {
    if (index >= 0) scroller.current?.scrollTo({ x: index * box.width, animated: true });
  }, [index, box.width]);

  return (
    <View
      style={styles.flex}
      onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
    >
      {box.width > 0 && (
        <LookProvider look={look}>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => onIndexChange(Math.round(e.nativeEvent.contentOffset.x / box.width))}
          >
            {pages.map((page) => (
              <View key={page} style={[styles.page, { width: box.width, height: box.height }]}>
                <Pressable onPress={() => onEdit(page)} style={styles.shadow} accessibilityLabel="이 슬라이드 입력하기">
                  {page === 'cover' ? (
                    <CoverSlide invitation={invitation} width={slide.width} />
                  ) : (
                    <FormSlide width={slide.width} height={slide.height} background={look.bg}>
                      <PageContent page={page} invitation={invitation} />
                    </FormSlide>
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </LookProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  shadow: { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#E8E8E8' },
});
```

- [ ] **Step 4: 탭바 삭제**

`src/features/invitation/editor/SectionSheet.tsx`에서 `SectionTabBar` 함수와 그것만 쓰는 스타일(`tabBar`, `tabs`, `tab`, `tabOn`, `dot`)을 지운다.

- [ ] **Step 5: 미리보기 라우트**

`src/app/create/editor/preview.tsx`:

```tsx
import { Redirect } from 'expo-router';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { useDraft } from '../../../features/invitation/useDraft';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import { lookFor } from '../../../features/invitation/view/look';

/** Step5 미리보기: 하객이 볼 모습 그대로 (고른 보기 형태) */
export default function EditorPreview() {
  const draft = useDraft();
  if (!draft) return <Redirect href="/create" />;
  const story = draft.viewMode === 'story';
  return (
    <Screen
      header={<Header title="미리보기" />}
      background={lookFor(draft.themeId, draft.templateId).bg}
      scroll={!story}
      contentStyle={story ? { flex: 1 } : undefined}
    >
      <InvitationView invitation={draft} />
    </Screen>
  );
}
```

- [ ] **Step 6: compose 화면 재작성**

`src/app/create/editor/compose.tsx` 전체:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '../../../components/AppModal';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { toast } from '../../../components/Toast';
import { CanvasEditor } from '../../../features/canvas/editor/CanvasEditor';
import { styleFor } from '../../../data/templates';
import { useEditor } from '../../../features/invitation/editorStore';
import { DockBar } from '../../../features/invitation/editor/DockBar';
import { dockItems } from '../../../features/invitation/editor/pages';
import { SavedModal, SaveNameModal } from '../../../features/invitation/editor/SaveModals';
import { SectionSheet } from '../../../features/invitation/editor/SectionSheet';
import { SlideStage } from '../../../features/invitation/editor/SlideStage';
import { useLeaveGuard } from '../../../features/invitation/editor/useLeaveGuard';
import { ViewModeModal } from '../../../features/invitation/editor/ViewModePicker';
import { CANVAS_PAGES, canFinalize, PageKey, SectionKey, sectionTabs } from '../../../features/invitation/model';
import { useDraft } from '../../../features/invitation/useDraft';
import { invitationService } from '../../../services';
import { colors, spacing } from '../../../theme';

/** Step 5. 정보 입력 — 가운데: 슬라이드 / 아래: 독바 / 표지: 직접 꾸미기 */
export default function EditorCompose() {
  const draft = useDraft();
  const dirty = useEditor((s) => s.dirty);
  const markSaved = useEditor((s) => s.markSaved);
  const startCanvas = useEditor((s) => s.startCanvas);
  const applyCanvas = useEditor((s) => s.applyCanvas);
  const resetDesign = useEditor((s) => s.resetDesign);
  const setViewMode = useEditor((s) => s.setViewMode);
  const [active, setActive] = useState(0);
  const [section, setSection] = useState<SectionKey | null>(null);
  const [canvasPage, setCanvasPage] = useState<PageKey | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [settings, setSettings] = useState(false);
  const [saveKind, setSaveKind] = useState<'draft' | 'final' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const guard = useLeaveGuard(dirty);

  if (!draft) return <Redirect href="/create" />;
  const items = dockItems(draft);
  const pages = items.flatMap((d) => (d.kind === 'page' ? [d.page] : []));
  const current = items[Math.min(active, items.length - 1)];
  const currentPage = current.kind === 'page' ? current.page : null;
  const design = currentPage ? draft.design[currentPage] : undefined;

  const askFinal = () => {
    if (!canFinalize(draft)) {
      const firstMissing = sectionTabs(draft.enabled).find((k) => !draft.completed[k]);
      toast('빨간 점이 있는 항목을 먼저 작성해 주세요.');
      if (firstMissing) setSection(firstMissing);
      return;
    }
    setSaveKind('final');
  };

  const save = async (name: string) => {
    setSaving(true);
    try {
      const result = await invitationService.save({
        ...draft,
        name,
        status: saveKind === 'final' ? 'active' : draft.status,
      });
      markSaved(result);
      setSaveKind(null);
      setSaved(true);
    } catch {
      toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const leaveTo = (href: '/home' | '/my-invites') => {
    guard.allow();
    setSaved(false);
    useEditor.getState().reset();
    router.dismissTo(href);
  };

  const selectDock = (i: number) => {
    setActive(i);
    const item = items[i];
    // 정보 칩은 페이지가 없으니 바로 입력 시트를 연다
    if (item.kind === 'info') setSection(item.section);
    else setSection(null);
  };

  const openCanvas = () => {
    if (!currentPage) return;
    if (design?.mode !== 'canvas') startCanvas(currentPage);
    setCanvasPage(currentPage);
  };

  // 캔버스 편집 중에는 화면 전체를 편집기에 넘긴다
  if (canvasPage) {
    const d = useEditor.getState().draft!.design[canvasPage];
    if (d?.mode === 'canvas') {
      return (
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <CanvasEditor
            initial={d.canvas}
            content={draft.content}
            style={styleFor(draft.themeId, draft.templateId)}
            onDone={(doc) => {
              applyCanvas(canvasPage, doc);
              setCanvasPage(null);
            }}
            onCancel={() => setCanvasPage(null)}
            onOpenBasic={() => {
              setCanvasPage(null);
              setSection('basic');
            }}
          />
          {guard.modal}
        </SafeAreaView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <Header
        title="정보 입력"
        // [b] 초대장 설정: Step3 로 돌아가되 입력값은 유지
        onBack={() => {
          guard.allow();
          router.dismissTo('/create/editor/options');
        }}
        right={
          <View style={styles.headerActions}>
            <Pressable onPress={() => setSettings(true)} hitSlop={8} accessibilityLabel="보기 형태 설정">
              <Ionicons name="settings-outline" size={20} color={colors.inkSoft} />
            </Pressable>
            <Pressable onPress={() => router.push('/create/editor/preview')} hitSlop={8} accessibilityLabel="미리보기">
              <Ionicons name="eye-outline" size={22} color={colors.inkSoft} />
            </Pressable>
            <Button label="임시저장" variant="chip" onPress={() => setSaveKind('draft')} />
            <Button label="최종저장" variant="chip" onPress={askFinal} />
          </View>
        }
      />
      <View style={[styles.flex, { backgroundColor: colors.surface }]}>
        <SlideStage
          invitation={draft}
          pages={pages}
          index={currentPage ? pages.indexOf(currentPage) : -1}
          onIndexChange={(i) => setActive(i)}
          onEdit={(page) => setSection(page === 'cover' ? 'basic' : (items.find((d) => d.kind === 'page' && d.page === page)?.section ?? null))}
        />
        {currentPage && CANVAS_PAGES.includes(currentPage) && (
          <View style={styles.slideActions}>
            <Button
              label={design?.mode === 'canvas' ? '다시 꾸미기' : '직접 꾸미기'}
              variant="tint"
              size="md"
              onPress={openCanvas}
            />
            {design?.mode === 'canvas' && (
              <Button label="템플릿 원래대로" variant="outline" size="md" onPress={() => setConfirmReset(true)} />
            )}
          </View>
        )}
        {section && <SectionSheet section={section} onClose={() => setSection(null)} />}
      </View>
      <DockBar items={items} active={active} invitation={draft} onSelect={selectDock} />

      <AppModal
        visible={confirmReset}
        title="템플릿 원래대로"
        message="꾸민 내용이 모두 사라집니다."
        onDismiss={() => setConfirmReset(false)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setConfirmReset(false) },
          {
            label: '되돌리기',
            onPress: () => {
              if (currentPage) resetDesign(currentPage);
              setConfirmReset(false);
            },
          },
        ]}
      />
      <ViewModeModal
        visible={settings}
        initial={draft.viewMode}
        confirmLabel="적용"
        onCancel={() => setSettings(false)}
        onConfirm={(m) => {
          setViewMode(m);
          setSettings(false);
        }}
      />
      <SaveNameModal
        visible={!!saveKind}
        kind={saveKind ?? 'draft'}
        initialName={draft.name}
        saving={saving}
        onCancel={() => setSaveKind(null)}
        onSave={save}
      />
      <SavedModal visible={saved} onHome={() => leaveTo('/home')} onMyInvites={() => leaveTo('/my-invites')} />
      {guard.modal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slideActions: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
```

`CanvasEditor`는 Task 9에서 만든다. 이 작업을 따로 확인하려면 Task 9 Step 1(빈 편집기 껍데기)부터 먼저 만든다 — 아래 Step 7.

(`Button`의 `variant="tint"`·`size="md"`는 `AppModal`에서 이미 쓰는 값이다. `onIndexChange`는 무대 인덱스 = 독바 인덱스다: 독바 앞쪽 항목이 페이지 순서와 같기 때문.)

- [ ] **Step 7: 편집기 껍데기 (Task 9에서 채움)**

`src/features/canvas/editor/CanvasEditor.tsx` 임시:

```tsx
import type { TemplateStyle } from '../../../data/templates';
import type { InvitationContent } from '../../invitation/model';
import type { CanvasDoc } from '../types';

export interface CanvasEditorProps {
  initial: CanvasDoc;
  content: InvitationContent;
  style: TemplateStyle;
  onDone: (doc: CanvasDoc) => void;
  onCancel: () => void;
  /** 연결 텍스트 수정 시 [기본정보 열기] */
  onOpenBasic: () => void;
}

/** 캔버스 편집기 — Task 9 에서 구현. 지금은 [완료]만 있는 빈 화면 */
export function CanvasEditor({ initial, onDone }: CanvasEditorProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button label="완료" onPress={() => onDone(initial)} />
    </View>
  );
}
```

(위 껍데기에 `import { View } from 'react-native';`, `import { Button } from '../../../components/Button';`을 넣는다.)

- [ ] **Step 8: 확인**

Run: `npx jest && npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 9: 커밋**

```bash
git add -A src
git commit -m "feat: Step5 슬라이드 무대·하단 독바·직접 꾸미기 버튼·보기 형태 설정·미리보기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 캔버스 편집기 — 선택·이동·크기·회전·가이드·텍스트·되돌리기

**Files:**
- Create: `src/features/canvas/editor/EditableElement.tsx`, `editor/Guides.tsx`, `editor/CanvasToolbar.tsx`, `editor/PropertyBar.tsx`, `editor/TextEditModal.tsx`
- Modify: `src/features/canvas/editor/CanvasEditor.tsx`(전체)

**Interfaces:**
- Consumes: `useCanvas`, Task 2 함수들, `CanvasSlide({ renderElement, overlay })`, `ElementView`·`ElementContent`·`elementHeight`
- Produces:
  - `EditableElement({ el, content, slideW, selected, interactive, onSelect, onCommit, onGuides, onDoubleTap })`
  - `Guides({ x, y, slideW, slideH })`
  - `CanvasToolbar({ onTool })` — `onTool(tool: ToolKey)`, `type ToolKey = 'text' | 'photo' | 'sticker' | 'gif' | 'video' | 'pen' | 'paste' | 'background' | 'bind'`
  - `PropertyBar({ el, colors, onChange, onCommand })` — `onCommand: (c: 'edit' | 'front' | 'back' | 'duplicate' | 'delete' | 'replace') => void`
  - `TextEditModal({ visible, initial, onDone(text), onCancel })`
  - `CanvasEditor` — 이후 작업은 `handleTool` 안의 `case`만 채운다

- [ ] **Step 1: 가이드선**

`src/features/canvas/editor/Guides.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

const GUIDE = '#3750BE';

/** 가운데 가이드선 — 요소가 가운데에 붙었을 때만 */
export function Guides({ x, y, slideW, slideH }: { x: boolean; y: boolean; slideW: number; slideH: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {x && <View style={{ position: 'absolute', left: slideW / 2, top: 0, width: 1, height: slideH, backgroundColor: GUIDE }} />}
      {y && <View style={{ position: 'absolute', top: slideH / 2, left: 0, height: 1, width: slideW, backgroundColor: GUIDE }} />}
    </View>
  );
}
```

- [ ] **Step 2: 편집 가능한 요소**

`src/features/canvas/editor/EditableElement.tsx`:

```tsx
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { InvitationContent } from '../../invitation/model';
import { clampWidth, SLIDE_RATIO, snapCenter, snapRotation } from '../model';
import { ElementContent, ElementView } from '../render/ElementView';
import type { CanvasElement } from '../types';

const HANDLE = 22;
const rad = (deg: number) => (deg * Math.PI) / 180;

interface Props {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  selected: boolean;
  /** 펜 모드 등에서는 끈다 */
  interactive: boolean;
  onSelect: () => void;
  /** 조작 하나가 끝나면 한 번 (되돌리기 1단계) */
  onCommit: (next: CanvasElement) => void;
  onGuides: (g: { x: boolean; y: boolean }) => void;
  onDoubleTap: () => void;
}

/**
 * 요소 제스처: 한 손가락 끌기 = 이동, 두 손가락 = 크기·회전, 더블탭 = 텍스트 수정.
 * 마우스(웹)·한 손 조작을 위해 선택 시 오른쪽 아래 손잡이로도 크기·회전을 바꾼다.
 * 진행 중 값은 이 컴포넌트 상태에만 두고, 손을 떼면 onCommit 한 번.
 */
export function EditableElement({ el, content, slideW, selected, interactive, onSelect, onCommit, onGuides, onDoubleTap }: Props) {
  const slideH = slideW * SLIDE_RATIO;
  const [live, setLive] = useState<CanvasElement | null>(null);
  const [boxH, setBoxH] = useState(0);
  const start = useRef(el);
  const current = useRef(el);
  const active = useRef(0);

  const update = (patch: Partial<CanvasElement>) => {
    current.current = { ...current.current, ...patch } as CanvasElement;
    setLive(current.current);
  };
  const begin = () => {
    if (active.current === 0) {
      start.current = el;
      current.current = el;
      onSelect();
    }
    active.current += 1;
  };
  const finish = () => {
    active.current = Math.max(0, active.current - 1);
    if (active.current > 0) return;
    onGuides({ x: false, y: false });
    const next = current.current;
    setLive(null);
    if (next !== el) onCommit(next);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => {
      const s = snapCenter(start.current.x + e.translationX / slideW, start.current.y + e.translationY / slideH);
      update({ x: s.x, y: s.y });
      onGuides({ x: s.guideX, y: s.guideY });
    })
    .onFinalize(finish);

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => update({ w: clampWidth(start.current.w * e.scale) }))
    .onFinalize(finish);

  const rotate = Gesture.Rotation()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => update({ rotation: snapRotation(start.current.rotation + (e.rotation * 180) / Math.PI) }))
    .onFinalize(finish);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => onDoubleTap());

  // 손잡이: 중심 → 손잡이 벡터의 길이 비율 = 크기, 각도 차 = 회전
  const handle = Gesture.Pan()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => {
      const s = start.current;
      const w0 = s.w * slideW;
      const h0 = boxH || w0;
      const r = rad(s.rotation);
      const vx = (w0 / 2) * Math.cos(r) - (h0 / 2) * Math.sin(r);
      const vy = (w0 / 2) * Math.sin(r) + (h0 / 2) * Math.cos(r);
      const nx = vx + e.translationX;
      const ny = vy + e.translationY;
      const scale = Math.hypot(nx, ny) / Math.hypot(vx, vy);
      const delta = ((Math.atan2(ny, nx) - Math.atan2(vy, vx)) * 180) / Math.PI;
      update({ w: clampWidth(s.w * scale), rotation: snapRotation(s.rotation + delta) });
    })
    .onFinalize(finish);

  const shown = live ?? el;
  const gesture = Gesture.Simultaneous(pan, pinch, rotate, doubleTap);

  return (
    <ElementView el={shown} content={content} slideW={slideW}>
      <GestureDetector gesture={gesture}>
        <View
          pointerEvents={interactive ? 'auto' : 'none'}
          style={selected ? styles.selected : undefined}
          accessibilityLabel="캔버스 요소"
        >
          <ElementContent el={shown} content={content} slideW={slideW} onLayout={(e) => setBoxH(e.nativeEvent.layout.height)} />
          {selected && interactive && (
            <GestureDetector gesture={handle}>
              <View style={styles.handle} accessibilityLabel="크기·회전 손잡이" />
            </GestureDetector>
          )}
        </View>
      </GestureDetector>
    </ElementView>
  );
}

const styles = StyleSheet.create({
  selected: { borderWidth: 1, borderColor: '#3750BE', borderStyle: 'dashed' },
  handle: {
    position: 'absolute',
    right: -HANDLE / 2,
    bottom: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3750BE',
  },
});
```

- [ ] **Step 3: 도구 줄**

`src/features/canvas/editor/CanvasToolbar.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, spacing } from '../../../theme';

export type ToolKey = 'text' | 'bind' | 'photo' | 'sticker' | 'gif' | 'video' | 'pen' | 'paste' | 'background';

const TOOLS: { key: ToolKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'text', label: '텍스트', icon: 'text-outline' },
  { key: 'bind', label: '정보 글자', icon: 'link-outline' },
  { key: 'photo', label: '사진', icon: 'image-outline' },
  { key: 'sticker', label: '스티커', icon: 'happy-outline' },
  { key: 'gif', label: 'GIF', icon: 'film-outline' },
  { key: 'video', label: '동영상', icon: 'videocam-outline' },
  { key: 'pen', label: '펜', icon: 'brush-outline' },
  { key: 'paste', label: '붙여넣기', icon: 'clipboard-outline' },
  { key: 'background', label: '배경', icon: 'color-fill-outline' },
];

/** 캔버스 상단 도구 줄 */
export function CanvasToolbar({ onTool, active }: { onTool: (t: ToolKey) => void; active?: ToolKey | null }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bar}>
      {TOOLS.map((t) => (
        <Pressable key={t.key} onPress={() => onTool(t.key)} style={styles.tool} accessibilityRole="button" accessibilityLabel={t.label}>
          <Ionicons name={t.icon} size={22} color={active === t.key ? colors.infoInk : colors.inkSoft} />
          <Txt variant="tiny" color={active === t.key ? colors.infoInk : colors.label}>
            {t.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: colors.canvas },
  row: { paddingHorizontal: spacing.sm },
  tool: { width: 60, paddingVertical: spacing.sm, alignItems: 'center', gap: 2 },
});
```

- [ ] **Step 4: 텍스트 입력 모달**

`src/features/canvas/editor/TextEditModal.tsx`:

```tsx
import { useEffect, useState } from 'react';

import { AppModal } from '../../../components/AppModal';
import { TextArea } from '../../../components/TextArea';
import { CANVAS_LIMITS } from '../model';

/** 텍스트 추가·수정 (최대 100자, 줄바꿈 가능) */
export function TextEditModal({
  visible,
  initial,
  onDone,
  onCancel,
}: {
  visible: boolean;
  initial: string;
  onDone: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);
  return (
    <AppModal
      visible={visible}
      title="텍스트"
      onDismiss={onCancel}
      actions={[
        { label: '취소', variant: 'outline', onPress: onCancel },
        { label: '확인', onPress: () => (text.trim() ? onDone(text) : onCancel()) },
      ]}
    >
      <TextArea value={text} onChangeText={setText} maxLength={CANVAS_LIMITS.text} placeholder="내용을 입력해 주세요" autoFocus />
    </AppModal>
  );
}
```

(`TextArea`의 props 이름을 `src/components/TextArea.tsx`에서 확인해 맞춘다. 글자 수 표시가 내장돼 있으면 그대로 쓴다.)

- [ ] **Step 5: 속성 바**

`src/features/canvas/editor/PropertyBar.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors as ui, radius, spacing } from '../../../theme';
import { CANVAS_FONTS } from '../model';
import type { CanvasElement, FontKey, TextAlign } from '../types';

export type PropertyCommand = 'edit' | 'replace' | 'front' | 'back' | 'duplicate' | 'delete';

const ALIGNS: { value: TextAlign; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'left', label: '왼쪽', icon: 'chevron-back-outline' },
  { value: 'center', label: '가운데', icon: 'remove-outline' },
  { value: 'right', label: '오른쪽', icon: 'chevron-forward-outline' },
];

/** 선택한 요소의 속성 바 — 글자: 서체·색·크기·정렬, 사진: 모양·교체, 공통: 순서·복제·삭제 */
export function PropertyBar({
  el,
  colors,
  onChange,
  onCommand,
}: {
  el: CanvasElement;
  colors: string[];
  onChange: (patch: Partial<CanvasElement>) => void;
  onCommand: (c: PropertyCommand) => void;
}) {
  const isText = el.kind === 'text' || el.kind === 'bound';
  const icon = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={styles.btn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={name} size={20} color={ui.inkSoft} />
      <Txt variant="tiny" color={ui.label}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {isText && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {(Object.keys(CANVAS_FONTS) as FontKey[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => onChange({ font: f })}
                style={[styles.font, el.font === f && styles.fontOn]}
                accessibilityRole="button"
              >
                <Txt variant="caption" style={{ fontFamily: CANVAS_FONTS[f].family }}>
                  {CANVAS_FONTS[f].label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.row}>
            {colors.map((c) => (
              <Pressable
                key={c}
                onPress={() => onChange({ color: c })}
                style={[styles.swatch, { backgroundColor: c }, el.color === c && styles.swatchOn]}
                accessibilityLabel={`색 ${c}`}
              />
            ))}
          </View>
        </>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {el.kind === 'text' && icon('create-outline', '수정', () => onCommand('edit'))}
        {el.kind === 'bound' && icon('create-outline', '수정', () => onCommand('edit'))}
        {isText && icon('remove-outline', '작게', () => onChange({ size: el.size * 0.9 }))}
        {isText && icon('add-outline', '크게', () => onChange({ size: el.size * 1.1 }))}
        {isText && ALIGNS.map((a) => icon(a.icon, a.label, () => onChange({ align: a.value })))}
        {el.kind === 'image' && icon('square-outline', '사각', () => onChange({ shape: 'rect' }))}
        {el.kind === 'image' && icon('tablet-portrait-outline', '둥근', () => onChange({ shape: 'rounded' }))}
        {el.kind === 'image' && icon('ellipse-outline', '원', () => onChange({ shape: 'circle' }))}
        {el.kind === 'image' && icon('swap-horizontal-outline', '교체', () => onCommand('replace'))}
        {icon('arrow-up-outline', '앞으로', () => onCommand('front'))}
        {icon('arrow-down-outline', '뒤로', () => onCommand('back'))}
        {icon('copy-outline', '복제', () => onCommand('duplicate'))}
        {icon('trash-outline', '삭제', () => onCommand('delete'))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: ui.hairline, backgroundColor: ui.canvas, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  btn: { width: 52, alignItems: 'center', gap: 2 },
  font: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.xs, borderWidth: 1, borderColor: ui.hairline },
  fontOn: { borderColor: ui.inkSoft },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
```

(속성 바의 `onChange`는 버튼 한 번 = 커밋 한 번이다.)

- [ ] **Step 6: 편집기 본체**

`src/features/canvas/editor/CanvasEditor.tsx` 전체:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Button } from '../../../components/Button';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import type { TemplateStyle } from '../../../data/templates';
import { colors, spacing } from '../../../theme';
import type { InvitationContent } from '../../invitation/model';
import { useCanvas } from '../canvasStore';
import {
  addElement,
  canAdd,
  duplicateElement,
  fitSlide,
  LIMIT_MESSAGE,
  newElementId,
  palette,
  removeElement,
  reorderElement,
  updateElement,
} from '../model';
import { CanvasSlide } from '../render/CanvasSlide';
import type { CanvasDoc, CanvasElement } from '../types';
import { CanvasToolbar, ToolKey } from './CanvasToolbar';
import { EditableElement } from './EditableElement';
import { Guides } from './Guides';
import { PropertyBar, PropertyCommand } from './PropertyBar';
import { TextEditModal } from './TextEditModal';

export interface CanvasEditorProps {
  initial: CanvasDoc;
  content: InvitationContent;
  style: TemplateStyle;
  onDone: (doc: CanvasDoc) => void;
  onCancel: () => void;
  /** 연결 텍스트 수정 시 [기본정보 열기] */
  onOpenBasic: () => void;
}

/** 캔버스 편집기: 상단 바(취소·되돌리기·다시하기·완료) → 도구 줄 → 슬라이드 → 속성 바 */
export function CanvasEditor({ initial, content, style, onDone, onCancel, onOpenBasic }: CanvasEditorProps) {
  const { doc, selectedId, tool, past, future, open, close, select, commit, undo, redo } = useCanvas();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });
  const [textModal, setTextModal] = useState<{ id: string | null; text: string } | null>(null);
  const [boundNotice, setBoundNotice] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const colorsList = useMemo(() => palette(style), [style]);

  useEffect(() => {
    open(initial);
    return () => close();
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!doc) return null;
  const slide = fitSlide(box.width - 32, box.height - 32);
  const selected = doc.elements.find((e) => e.id === selectedId) ?? null;

  /** 한도 검사 후 추가하고 선택 */
  const add = (el: CanvasElement) => {
    const err = canAdd(doc, el.kind);
    if (err) {
      toast(LIMIT_MESSAGE[err]);
      return;
    }
    commit(addElement(doc, el));
    select(el.id);
  };

  const textBase = {
    x: 0.5,
    y: 0.5,
    w: 0.8,
    rotation: 0,
    font: style.font === 'serif' ? ('serif' as const) : ('sans' as const),
    color: style.fg,
    size: 20 / 360,
    align: 'center' as const,
  };

  const handleTool = (t: ToolKey) => {
    switch (t) {
      case 'text':
        setTextModal({ id: null, text: '' });
        break;
      // 아래 도구는 Task 10~13 에서 채운다
      default:
        toast('준비 중이에요.');
    }
  };

  const handleCommand = (c: PropertyCommand) => {
    if (!selected) return;
    if (c === 'delete') commit(removeElement(doc, selected.id));
    if (c === 'front' || c === 'back') commit(reorderElement(doc, selected.id, c));
    if (c === 'duplicate') {
      const err = canAdd(doc, selected.kind);
      if (err) return toast(LIMIT_MESSAGE[err]);
      const r = duplicateElement(doc, selected.id);
      commit(r.doc);
      select(r.id);
    }
    if (c === 'edit') {
      if (selected.kind === 'text') setTextModal({ id: selected.id, text: selected.text });
      if (selected.kind === 'bound') setBoundNotice(true);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Pressable onPress={() => (past.length ? setConfirmCancel(true) : onCancel())} hitSlop={10} accessibilityLabel="꾸미기 취소">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
        <View style={styles.topMid}>
          <Pressable onPress={undo} disabled={!past.length} hitSlop={8} accessibilityLabel="되돌리기">
            <Ionicons name="arrow-undo-outline" size={22} color={past.length ? colors.inkSoft : colors.placeholder} />
          </Pressable>
          <Pressable onPress={redo} disabled={!future.length} hitSlop={8} accessibilityLabel="다시하기">
            <Ionicons name="arrow-redo-outline" size={22} color={future.length ? colors.inkSoft : colors.placeholder} />
          </Pressable>
        </View>
        <Button label="완료" variant="chip" onPress={() => onDone(doc)} />
      </View>
      <CanvasToolbar onTool={handleTool} active={tool === 'select' ? null : 'pen'} />

      <Pressable
        style={[styles.flex, styles.stage]}
        onPress={() => select(null)}
        accessible={false}
        onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
      >
        {box.width > 0 && (
          <CanvasSlide
            doc={doc}
            content={content}
            templateBg={style.bg}
            width={slide.width}
            renderElement={(el) => (
              <EditableElement
                el={el}
                content={content}
                slideW={slide.width}
                selected={el.id === selectedId}
                interactive={tool === 'select'}
                onSelect={() => select(el.id)}
                onCommit={(next) => commit(updateElement(doc, el.id, next))}
                onGuides={setGuides}
                onDoubleTap={() => {
                  if (el.kind === 'text') setTextModal({ id: el.id, text: el.text });
                  if (el.kind === 'bound') setBoundNotice(true);
                }}
              />
            )}
            overlay={<Guides x={guides.x} y={guides.y} slideW={slide.width} slideH={slide.height} />}
          />
        )}
      </Pressable>

      {selected && tool === 'select' && (
        <PropertyBar
          el={selected}
          colors={colorsList}
          onChange={(patch) => commit(updateElement(doc, selected.id, patch))}
          onCommand={handleCommand}
        />
      )}

      <TextEditModal
        visible={!!textModal}
        initial={textModal?.text ?? ''}
        onCancel={() => setTextModal(null)}
        onDone={(text) => {
          if (textModal?.id) commit(updateElement(doc, textModal.id, { text } as Partial<CanvasElement>));
          else add({ ...textBase, id: newElementId(), kind: 'text', text });
          setTextModal(null);
        }}
      />
      <AppModal
        visible={boundNotice}
        message={'이 글자는 기본정보와 연결돼 있어요.\n기본정보에서 바꿀 수 있어요.'}
        onDismiss={() => setBoundNotice(false)}
        actions={[
          { label: '닫기', variant: 'outline', onPress: () => setBoundNotice(false) },
          {
            label: '기본정보 열기',
            onPress: () => {
              setBoundNotice(false);
              // 지금까지 꾸민 내용은 저장하고 연다
              onDone(doc);
              onOpenBasic();
            },
          },
        ]}
      />
      <AppModal
        visible={confirmCancel}
        message="꾸민 내용을 저장하지 않고 나갈까요?"
        onDismiss={() => setConfirmCancel(false)}
        actions={[
          { label: '계속 꾸미기', variant: 'outline', onPress: () => setConfirmCancel(false) },
          { label: '나가기', onPress: () => { setConfirmCancel(false); onCancel(); } },
        ]}
      />
      <Txt variant="tiny" color={colors.faint} align="center" style={styles.hint}>
        두 손가락으로 크기·회전, 손잡이로도 바꿀 수 있어요.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  topMid: { flexDirection: 'row', gap: spacing.xl },
  stage: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hint: { paddingVertical: 4, backgroundColor: colors.surface },
});
```

**배경 탭으로 선택 풀기 주의:** 요소를 누르면 요소 제스처(`onBegin` → 선택)와 바깥 `Pressable`의 `onPress`(→ 선택 해제)가 둘 다 일어날 수 있다. 그래서 요소를 마지막으로 만진 시각을 기억하고, 그 직후의 배경 탭은 무시한다. 위 코드에서 다음 두 곳을 바꾼다.

```tsx
  // 컴포넌트 안 상태 선언 옆 (useRef 를 react import 에 추가)
  const touchedAt = useRef(0);
```

```tsx
      <Pressable
        style={[styles.flex, styles.stage]}
        // 요소를 누른 직후(300ms)의 배경 탭은 같은 터치이므로 무시
        onPress={() => Date.now() - touchedAt.current > 300 && select(null)}
```

```tsx
                onSelect={() => {
                  touchedAt.current = Date.now();
                  select(el.id);
                }}
```

(Task 12에서 `onSelect`를 지우개용으로 바꿀 때도 첫 줄에 `touchedAt.current = Date.now();`를 남긴다.)

그리고 `onDone` 호출 시 compose의 `onDone`은 `setCanvasPage(null)`까지 하므로, `[기본정보 열기]`는 `onDone(doc)` 뒤 `onOpenBasic()`이 시트를 연다(compose Task 8 Step 6의 `onOpenBasic`이 `setCanvasPage(null)`과 `setSection('basic')`을 함).

- [ ] **Step 7: 확인**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

- [ ] **Step 8: 커밋**

```bash
git add -A src
git commit -m "feat: 캔버스 편집기 — 이동·크기·회전·가운데 가이드·텍스트·속성 바·되돌리기

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 스티커·연결 텍스트·배경

**Files:**
- Create: `src/features/canvas/editor/Pickers.tsx`
- Modify: `src/features/canvas/editor/CanvasEditor.tsx`(`handleTool`에 `sticker`·`bind`·`background` 추가)

**Interfaces:**
- Consumes: `ICON_SOURCES`, `BIND_LABEL`, `palette`, Task 11의 `pickCanvasImage`(배경 사진 — Task 11 전에는 사진 버튼을 숨기지 말고 Task 11에서 연결한다. 이 작업에서는 `onPhoto` 콜백만 받는다)
- Produces:
  - `StickerPicker({ visible, onPick(icon), onPickSymbol(text), onClose })`
  - `BindPicker({ visible, onPick(bind), onClose })`
  - `BackgroundPicker({ visible, colors, current, onTemplate, onColor(color), onPhoto, onClose })`

- [ ] **Step 1: 선택 모달들**

`src/features/canvas/editor/Pickers.tsx`:

```tsx
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { ICON_SOURCES, Icon3DName } from '../../../components/brand/Icon3D';
import { Txt } from '../../../components/Txt';
import { colors as ui, radius, spacing } from '../../../theme';
import { BIND_LABEL } from '../model';
import type { BindKey, CanvasBackground } from '../types';

/** 장식 글자 — 텍스트 요소로 들어간다 */
const SYMBOLS = ['♥', '♡', '❀', '✿', '✦', '✧', '☾', '∞'];

export function StickerPicker({
  visible,
  onPick,
  onPickSymbol,
  onClose,
}: {
  visible: boolean;
  onPick: (icon: Icon3DName) => void;
  onPickSymbol: (symbol: string) => void;
  onClose: () => void;
}) {
  return (
    <AppModal visible={visible} title="스티커" onDismiss={onClose} actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}>
      <View style={styles.grid}>
        {(Object.keys(ICON_SOURCES) as Icon3DName[]).map((name) => (
          <Pressable key={name} onPress={() => onPick(name)} style={styles.cell} accessibilityLabel={`스티커 ${name}`}>
            <Image source={ICON_SOURCES[name]} style={styles.icon} contentFit="contain" />
          </Pressable>
        ))}
      </View>
      <Txt variant="caption" weight="semibold" color={ui.label}>
        장식 글자
      </Txt>
      <View style={styles.grid}>
        {SYMBOLS.map((s) => (
          <Pressable key={s} onPress={() => onPickSymbol(s)} style={styles.cell} accessibilityLabel={`장식 ${s}`}>
            <Txt variant="title">{s}</Txt>
          </Pressable>
        ))}
      </View>
    </AppModal>
  );
}

export function BindPicker({ visible, onPick, onClose }: { visible: boolean; onPick: (b: BindKey) => void; onClose: () => void }) {
  return (
    <AppModal
      visible={visible}
      title="정보 글자"
      message="기본정보·예식정보에 쓴 값이 들어가요."
      onDismiss={onClose}
      actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}
    >
      <View style={styles.list}>
        {(Object.keys(BIND_LABEL) as BindKey[]).map((b) => (
          <Pressable key={b} onPress={() => onPick(b)} style={styles.row} accessibilityRole="button">
            <Txt>{BIND_LABEL[b]}</Txt>
          </Pressable>
        ))}
      </View>
    </AppModal>
  );
}

export function BackgroundPicker({
  visible,
  colors,
  current,
  onTemplate,
  onColor,
  onPhoto,
  onClose,
}: {
  visible: boolean;
  colors: string[];
  current: CanvasBackground;
  onTemplate: () => void;
  onColor: (c: string) => void;
  onPhoto: () => void;
  onClose: () => void;
}) {
  return (
    <AppModal visible={visible} title="배경" onDismiss={onClose} actions={[{ label: '닫기', variant: 'outline', onPress: onClose }]}>
      <View style={styles.list}>
        <Pressable onPress={onTemplate} style={[styles.row, current.kind === 'template' && styles.rowOn]} accessibilityRole="button">
          <Txt>템플릿 기본</Txt>
        </Pressable>
        <Pressable onPress={onPhoto} style={[styles.row, current.kind === 'image' && styles.rowOn]} accessibilityRole="button">
          <Txt>사진으로 채우기</Txt>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {colors.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[styles.swatch, { backgroundColor: c }, current.kind === 'color' && current.color === c && styles.swatchOn]}
            accessibilityLabel={`배경색 ${c}`}
          />
        ))}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  cell: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: ui.surface },
  icon: { width: 40, height: 40 },
  list: { gap: spacing.xs, marginVertical: spacing.sm },
  row: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: ui.hairline },
  rowOn: { borderColor: ui.inkSoft },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
```

- [ ] **Step 2: 편집기에 연결**

`CanvasEditor.tsx`:
- import: `import { BackgroundPicker, BindPicker, StickerPicker } from './Pickers';`
- 상태: `const [picker, setPicker] = useState<'sticker' | 'bind' | 'background' | null>(null);`
- `handleTool`의 `switch`에 추가:

```ts
      case 'sticker':
      case 'bind':
      case 'background':
        setPicker(t);
        break;
```

- 모달 렌더(다른 모달 옆):

```tsx
      <StickerPicker
        visible={picker === 'sticker'}
        onClose={() => setPicker(null)}
        onPick={(icon) => {
          setPicker(null);
          add({ id: newElementId(), kind: 'sticker', icon, aspect: 1, x: 0.5, y: 0.5, w: 0.25, rotation: 0 });
        }}
        onPickSymbol={(symbol) => {
          setPicker(null);
          add({ ...textBase, id: newElementId(), kind: 'text', text: symbol, w: 0.3, size: 40 / 360, color: style.accent });
        }}
      />
      <BindPicker
        visible={picker === 'bind'}
        onClose={() => setPicker(null)}
        onPick={(bind) => {
          setPicker(null);
          add({ ...textBase, id: newElementId(), kind: 'bound', bind });
        }}
      />
      <BackgroundPicker
        visible={picker === 'background'}
        colors={colorsList}
        current={doc.background}
        onClose={() => setPicker(null)}
        onTemplate={() => commit({ ...doc, background: { kind: 'template' } })}
        onColor={(color) => commit({ ...doc, background: { kind: 'color', color } })}
        onPhoto={() => {
          setPicker(null);
          pickBackgroundPhoto();
        }}
      />
```

- `pickBackgroundPhoto`는 이 작업에서 `const pickBackgroundPhoto = () => toast('준비 중이에요.');`로 두고 Task 11에서 채운다.

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 스티커·장식 글자·정보 글자(연결 텍스트)·배경 선택

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 사진·GIF·동영상

**Files:**
- Create: `src/features/canvas/media.ts`
- Modify: `src/features/canvas/editor/CanvasEditor.tsx`

**Interfaces:**
- Consumes: `checkGif`, `checkVideo`, `isGifFile`, `needsSessionUrl`, `IMAGE_EXTENSIONS`
- Produces:
  - `type PickedVisual = { kind: 'image' | 'gif'; uri: string; aspect: number }`
  - `pickCanvasVisual(): Promise<PickedVisual | null>` — 사진 또는 GIF(앨범)
  - `pickCanvasVideo(): Promise<{ uri: string; aspect: number; durationMs: number } | null>`
  - `storeImage(uri, opts: { width: number; png: boolean }): Promise<string>` — 압축 저장 (Task 13 붙여넣기도 씀)
  - `sessionUrl(uri): Promise<string>` — 웹 data URI → 객체 URL

- [ ] **Step 1: 미디어 모듈**

`src/features/canvas/media.ts`:

```ts
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { toast } from '../../components/Toast';
import { IMAGE_EXTENSIONS } from '../invitation/model';
import { checkGif, checkVideo, isGifFile, needsSessionUrl } from './model';

const MAX_SIDE = 1280;

export type PickedVisual = { kind: 'image' | 'gif'; uri: string; aspect: number };

/** 웹: data URI 를 객체 URL 로 (저장 용량 보호, 새로고침하면 사라진다) */
export async function sessionUrl(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return URL.createObjectURL(blob);
}

/** 사진 압축 저장: 긴 변 1280px. 투명 PNG 는 PNG 유지, 나머지는 JPEG 70% */
export async function storeImage(uri: string, opts: { width: number; height: number; png: boolean }): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (Math.max(opts.width, opts.height) > MAX_SIDE) {
      ctx.resize(opts.width >= opts.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const ref = await ctx.renderAsync();
    const web = Platform.OS === 'web';
    const format = opts.png ? SaveFormat.PNG : SaveFormat.JPEG;
    const result = await ref.saveAsync({ compress: 0.7, format, base64: web });
    if (web && result.base64) return `data:image/${opts.png ? 'png' : 'jpeg'};base64,${result.base64}`;
    return result.uri;
  } catch {
    return uri;
  }
}

const extOf = (name?: string | null) => (name?.split('.').pop() ?? '').toLowerCase();

/** 앨범에서 사진 또는 GIF 한 장 */
export async function pickCanvasVisual(): Promise<PickedVisual | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
    // iOS 에서 GIF 가 JPEG 로 바뀌지 않게 원본 표현 유지
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (result.canceled || !result.assets.length) return null;
  const a = result.assets[0];
  const aspect = a.width && a.height ? a.height / a.width : 1;

  if (isGifFile({ name: a.fileName, mimeType: a.mimeType, uri: a.uri })) {
    if (checkGif({ size: a.fileSize })) {
      toast('GIF는 10MB 이하로 올려주세요.');
      return null;
    }
    // GIF 는 압축하면 움직임이 사라지므로 그대로 둔다
    const uri = needsSessionUrl('gif', a.uri, Platform.OS) ? await sessionUrl(a.uri) : a.uri;
    return { kind: 'gif', uri, aspect };
  }

  const ext = extOf(a.fileName) || (a.mimeType?.split('/')[1] ?? '');
  if (ext && !IMAGE_EXTENSIONS.includes(ext) && !a.mimeType?.startsWith('image/')) {
    toast('허용되지 않은 확장자입니다.');
    return null;
  }
  const png = ext === 'png' || a.mimeType === 'image/png';
  return { kind: 'image', uri: await storeImage(a.uri, { width: a.width, height: a.height, png }), aspect };
}

/** 앨범에서 동영상 한 개 (15초·30MB·mp4/mov) */
export async function pickCanvasVideo(): Promise<{ uri: string; aspect: number; durationMs: number } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false });
  if (result.canceled || !result.assets.length) return null;
  const a = result.assets[0];
  const check = checkVideo({ name: a.fileName, mimeType: a.mimeType, size: a.fileSize, durationMs: a.duration });
  if (check === 'extension') {
    toast('mp4·mov 영상만 올릴 수 있어요.');
    return null;
  }
  if (check === 'duration') {
    toast('15초 이하 영상만 올릴 수 있어요.');
    return null;
  }
  if (check === 'size') {
    toast('30MB 이하로 올려주세요.');
    return null;
  }
  const uri = needsSessionUrl('video', a.uri, Platform.OS) ? await sessionUrl(a.uri) : a.uri;
  return { uri, aspect: a.width && a.height ? a.height / a.width : 9 / 16, durationMs: a.duration ?? 0 };
}
```

(`preferredAssetRepresentationMode`·`UIImagePickerPreferredAssetRepresentationMode` 이름과 `asset.duration` 단위(ms)는 `node_modules/expo-image-picker/build/ImagePicker.types.d.ts`에서 확인해 맞춘다. 동영상 확장자 오류 문구는 설계 문서 5장에 없어서 "mp4·mov 영상만 올릴 수 있어요."로 정했다 — Task 14에서 설계 문서에 추가.)

- [ ] **Step 2: 편집기에 연결**

`CanvasEditor.tsx`:
- import: `import { pickCanvasVideo, pickCanvasVisual } from '../media';`
- `handleTool`에 추가:

```ts
      case 'photo':
      case 'gif': {
        // 같은 앨범 선택기에서 사진·GIF 를 판별한다
        if (t === 'gif') {
          const err = canAdd(doc, 'gif');
          if (err) return toast(LIMIT_MESSAGE[err]);
        }
        pickCanvasVisual().then((v) => {
          if (!v) return;
          const base = { id: newElementId(), x: 0.5, y: 0.5, w: 0.6, rotation: 0, uri: v.uri, aspect: v.aspect };
          add(v.kind === 'gif' ? { ...base, kind: 'gif' } : { ...base, kind: 'image', shape: 'rect' });
        });
        break;
      }
      case 'video': {
        const err = canAdd(doc, 'video');
        if (err) return toast(LIMIT_MESSAGE[err]);
        pickCanvasVideo().then((v) => {
          if (!v) return;
          add({ id: newElementId(), kind: 'video', x: 0.5, y: 0.5, w: 0.6, rotation: 0, uri: v.uri, aspect: v.aspect, durationMs: v.durationMs });
        });
        break;
      }
```

- `add`는 클로저의 `doc`을 쓰므로 비동기 뒤에는 최신 문서를 써야 한다. `add` 첫 줄을 `const cur = useCanvas.getState().doc!;`로 두고 `doc` 대신 `cur`을 쓴다.
- `handleCommand`에 교체 추가:

```ts
    if (c === 'replace' && selected.kind === 'image') {
      pickCanvasVisual().then((v) => {
        const cur = useCanvas.getState().doc!;
        if (v?.kind === 'image') commit(updateElement(cur, selected.id, { uri: v.uri, aspect: v.aspect }));
        else if (v) toast('사진만 교체할 수 있어요.');
      });
    }
```

- `pickBackgroundPhoto`를 바꾼다:

```ts
  const pickBackgroundPhoto = () =>
    pickCanvasVisual().then((v) => {
      if (!v) return;
      if (v.kind === 'gif') return toast('배경은 사진만 쓸 수 있어요.');
      const cur = useCanvas.getState().doc!;
      commit({ ...cur, background: { kind: 'image', uri: v.uri } });
    });
```

- 같은 이유로 `commit`도 비동기 뒤에는 `useCanvas.getState().commit`과 최신 `doc`을 쓴다(위 코드처럼).

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 사진(압축)·GIF·동영상 추가, 사진 교체, 사진 배경

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 그리기 펜·지우개

**Files:**
- Create: `src/features/canvas/editor/PenLayer.tsx`
- Modify: `src/features/canvas/editor/CanvasEditor.tsx`

**Interfaces:**
- Consumes: `strokeFromPoints`, `canAdd`, `useCanvas.tool/setTool`
- Produces:
  - `PenLayer({ slideW, slideH, color, widthPx, onStroke(points) })` — 슬라이드를 덮는 그리기 층
  - `PenOptions({ colors, color, width, tool, onColor, onWidth, onTool, onClose })`
  - 펜 굵기 3단계 `PEN_WIDTHS = [2, 4, 8]`(360px 기준 px)

- [ ] **Step 1: 펜 층**

`src/features/canvas/editor/PenLayer.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '../../../components/Txt';
import { colors as ui, spacing } from '../../../theme';
import type { CanvasTool } from '../canvasStore';

/** 360px 폭 기준 굵기 3단계 */
export const PEN_WIDTHS = [2, 4, 8];

type Pt = { x: number; y: number };
const toPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

/** 펜 모드일 때 슬라이드를 덮는 층. 한 번 그은 선 = 요소 하나 */
export function PenLayer({
  slideW,
  slideH,
  color,
  widthPx,
  onStroke,
}: {
  slideW: number;
  slideH: number;
  color: string;
  widthPx: number;
  onStroke: (points: Pt[]) => void;
}) {
  const [points, setPoints] = useState<Pt[]>([]);
  const ref = useRef<Pt[]>([]);
  const draw = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      ref.current = [{ x: e.x, y: e.y }];
      setPoints(ref.current);
    })
    .onUpdate((e) => {
      ref.current = [...ref.current, { x: e.x, y: e.y }];
      setPoints(ref.current);
    })
    .onFinalize(() => {
      onStroke(ref.current);
      ref.current = [];
      setPoints([]);
    });

  return (
    <GestureDetector gesture={draw}>
      <View style={StyleSheet.absoluteFill} accessibilityLabel="그리기 영역">
        <Svg width={slideW} height={slideH}>
          {points.length > 1 && (
            <Path d={toPath(points)} stroke={color} strokeWidth={widthPx} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}

/** 펜 옵션 바: 펜/지우개, 굵기, 색, 끝내기 */
export function PenOptions({
  colors,
  color,
  width,
  tool,
  onColor,
  onWidth,
  onTool,
  onClose,
}: {
  colors: string[];
  color: string;
  width: number;
  tool: CanvasTool;
  onColor: (c: string) => void;
  onWidth: (w: number) => void;
  onTool: (t: CanvasTool) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={() => onTool('pen')} style={[styles.mode, tool === 'pen' && styles.on]} accessibilityLabel="펜">
          <Ionicons name="brush-outline" size={20} color={ui.inkSoft} />
        </Pressable>
        <Pressable onPress={() => onTool('eraser')} style={[styles.mode, tool === 'eraser' && styles.on]} accessibilityLabel="지우개">
          <Ionicons name="backspace-outline" size={20} color={ui.inkSoft} />
        </Pressable>
        {PEN_WIDTHS.map((w) => (
          <Pressable key={w} onPress={() => onWidth(w)} style={[styles.mode, width === w && styles.on]} accessibilityLabel={`굵기 ${w}`}>
            <View style={{ width: 18, height: w, borderRadius: w, backgroundColor: ui.inkSoft }} />
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
          <Txt variant="caption" weight="semibold">
            그리기 끝
          </Txt>
        </Pressable>
      </View>
      <View style={styles.row}>
        {colors.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
            accessibilityLabel={`펜 색 ${c}`}
          />
        ))}
      </View>
      {tool === 'eraser' && (
        <Txt variant="tiny" color={ui.muted} align="center">
          지울 선을 눌러 주세요.
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: ui.hairline, backgroundColor: ui.canvas, paddingVertical: spacing.xs, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  mode: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: ui.surface, borderWidth: 1, borderColor: ui.inkSoft },
  close: { marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: ui.hairline },
  swatchOn: { borderWidth: 3, borderColor: ui.infoInk },
});
```

- [ ] **Step 2: 편집기에 연결**

`CanvasEditor.tsx`:
- import: `import { PEN_WIDTHS, PenLayer, PenOptions } from './PenLayer';`, `strokeFromPoints`를 `../model` import에 추가, `setTool`을 `useCanvas()` 구조분해에 추가.
- 상태: `const [penColor, setPenColor] = useState(style.fg);`, `const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);`
- `handleTool`에 `case 'pen': setTool('pen'); break;`
- `CanvasSlide`의 `overlay`를 바꾼다:

```tsx
            overlay={
              <>
                <Guides x={guides.x} y={guides.y} slideW={slide.width} slideH={slide.height} />
                {tool === 'pen' && (
                  <PenLayer
                    slideW={slide.width}
                    slideH={slide.height}
                    color={penColor}
                    widthPx={(penWidth / 360) * slide.width}
                    onStroke={(pts) => {
                      const cur = useCanvas.getState().doc!;
                      const stroke = strokeFromPoints(pts, slide.width, penColor, (penWidth / 360) * slide.width);
                      if (!stroke) return;
                      const err = canAdd(cur, 'stroke');
                      if (err) return toast(LIMIT_MESSAGE[err]);
                      useCanvas.getState().commit(addElement(cur, stroke));
                    }}
                  />
                )}
              </>
            }
```

- `EditableElement`의 `interactive`를 `tool === 'select' || (tool === 'eraser' && el.kind === 'stroke')`로, `onSelect`를 다음으로:

```tsx
                onSelect={() => {
                  if (tool === 'eraser') {
                    if (el.kind === 'stroke') commit(removeElement(useCanvas.getState().doc!, el.id));
                    return;
                  }
                  select(el.id);
                }}
```

(지우개 모드에서 선을 누르면 `EditableElement`의 pan `onBegin`이 `onSelect`를 부르므로 바로 지워진다. 그 뒤 `finish`가 `onCommit`을 부르지 않도록 — `next === el`이면 커밋하지 않으므로 안전하다.)

- 속성 바 자리: `tool !== 'select'`이면 `PropertyBar` 대신 다음을 보인다:

```tsx
      {tool !== 'select' && (
        <PenOptions
          colors={colorsList}
          color={penColor}
          width={penWidth}
          tool={tool}
          onColor={setPenColor}
          onWidth={setPenWidth}
          onTool={setTool}
          onClose={() => setTool('select')}
        />
      )}
```

- 펜 모드에서 무대 바깥 `Pressable`의 `onPress={() => select(null)}`은 그대로 둔다(펜 층이 슬라이드 위 터치를 가져간다).

- [ ] **Step 3: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 그리기 펜(굵기 3단계·팔레트)·선 지우개

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 붙여넣기와 웹 단축키

**Files:**
- Create: `src/features/canvas/paste.ts`, `src/features/canvas/useWebCanvasKeys.ts`
- Modify: `src/features/canvas/editor/CanvasEditor.tsx`

**Interfaces:**
- Consumes: `textForPaste`, `isGifFile`, `checkGif`, `storeImage`, `sessionUrl`
- Produces:
  - `type PasteResult = { kind: 'image' | 'gif'; uri: string; aspect: number } | { kind: 'text'; text: string } | { kind: 'empty' } | { kind: 'unsupported' } | { kind: 'tooLarge' }`
  - `readClipboard(): Promise<PasteResult>` — [붙여넣기] 버튼
  - `fromPasteEvent(e: ClipboardEvent): Promise<PasteResult>` — 웹 Ctrl+V
  - `useWebCanvasKeys({ onDelete, onUndo, onRedo, onPaste(result) })`

- [ ] **Step 1: 클립보드 모듈**

`src/features/canvas/paste.ts`:

```ts
import * as Clipboard from 'expo-clipboard';
import { Image as RNImage, Platform } from 'react-native';

import { checkGif, isGifFile, textForPaste } from './model';
import { sessionUrl, storeImage } from './media';

export type PasteResult =
  | { kind: 'image' | 'gif'; uri: string; aspect: number }
  | { kind: 'text'; text: string }
  | { kind: 'empty' }
  | { kind: 'unsupported' }
  | { kind: 'tooLarge' };

const sizeOf = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve) =>
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), () => resolve({ width: 1, height: 1 })),
  );

/** 웹 파일(Blob) → 붙여넣기 결과. GIF 는 객체 URL 그대로, 사진은 압축 */
async function fromBlob(file: Blob): Promise<PasteResult> {
  if (isGifFile({ mimeType: file.type })) {
    if (checkGif({ size: file.size })) return { kind: 'tooLarge' };
    const uri = URL.createObjectURL(file);
    const { width, height } = await sizeOf(uri);
    return { kind: 'gif', uri, aspect: height / width };
  }
  const raw = URL.createObjectURL(file);
  const { width, height } = await sizeOf(raw);
  const uri = await storeImage(raw, { width, height, png: file.type === 'image/png' });
  return { kind: 'image', uri, aspect: height / width };
}

/** [붙여넣기] 버튼: 이미지 → 텍스트 순으로 확인 */
export async function readClipboard(): Promise<PasteResult> {
  if (Platform.OS === 'web') {
    const clip = navigator.clipboard as Clipboard | undefined;
    if (!clip?.read) return { kind: 'unsupported' };
    try {
      const items = await clip.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) return fromBlob(await item.getType(type));
      }
      const text = textForPaste(await navigator.clipboard.readText());
      return text ? { kind: 'text', text } : { kind: 'empty' };
    } catch {
      // 권한 거부·브라우저 미지원
      return { kind: 'unsupported' };
    }
  }

  if (await Clipboard.hasImageAsync()) {
    const img = await Clipboard.getImageAsync({ format: 'png' });
    if (img) {
      const { width, height } = img.size;
      const uri = await storeImage(img.data, { width, height, png: true });
      return { kind: 'image', uri, aspect: height / width };
    }
  }
  // iOS 는 권한 거부와 빈 클립보드를 구분할 수 없다 — 둘 다 '비었음' 안내
  const text = textForPaste(await Clipboard.getStringAsync());
  return text ? { kind: 'text', text } : { kind: 'empty' };
}

/** 웹 Ctrl+V: 파일(GIF 포함) → 텍스트 */
export async function fromPasteEvent(e: ClipboardEvent): Promise<PasteResult> {
  const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
  if (file) return fromBlob(file);
  const text = textForPaste(e.clipboardData?.getData('text/plain') ?? '');
  return text ? { kind: 'text', text } : { kind: 'empty' };
}

export const PASTE_MESSAGE = {
  empty: '붙여넣을 내용이 없어요.',
  unsupported: 'Ctrl+V로 붙여넣어 주세요.',
  tooLarge: 'GIF는 10MB 이하로 올려주세요.',
} as const;
```

(`navigator.clipboard as Clipboard`에서 `Clipboard`가 expo-clipboard 네임스페이스와 이름이 겹친다. 타입은 `globalThis.Clipboard`로 쓰거나 `const clip = navigator.clipboard;`로 두고 `'read' in clip`으로 확인한다. `RNImage.getSize`가 `blob:` URL을 웹에서 처리하는지 확인 — 안 되면 `new window.Image()`로 `naturalWidth/Height`를 읽는다. 사진 압축 `storeImage`는 `blob:` URL을 받는다. 압축 후 객체 URL은 `URL.revokeObjectURL(raw)`로 정리한다.)

- [ ] **Step 2: 웹 단축키 훅**

`src/features/canvas/useWebCanvasKeys.ts`:

```ts
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
  h.current = handlers;

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
```

- [ ] **Step 3: 편집기에 연결**

`CanvasEditor.tsx`:
- import: `import { PASTE_MESSAGE, PasteResult, readClipboard } from '../paste';`, `import { useWebCanvasKeys } from '../useWebCanvasKeys';`
- 붙여넣기 처리 함수(컴포넌트 안, `add` 아래):

```ts
  const applyPaste = (r: PasteResult) => {
    if (r.kind === 'empty' || r.kind === 'unsupported' || r.kind === 'tooLarge') return toast(PASTE_MESSAGE[r.kind]);
    if (r.kind === 'text') return add({ ...textBase, id: newElementId(), kind: 'text', text: r.text });
    const base = { id: newElementId(), x: 0.5, y: 0.5, w: 0.6, rotation: 0, uri: r.uri, aspect: r.aspect };
    add(r.kind === 'gif' ? { ...base, kind: 'gif' } : { ...base, kind: 'image', shape: 'rect' });
  };
```

- `handleTool`에 `case 'paste': readClipboard().then(applyPaste); break;`
- 훅 호출은 `if (!doc) return null;` **위**에 둔다(훅 규칙):

```ts
  useWebCanvasKeys({
    onDelete: () => {
      const s = useCanvas.getState();
      if (s.doc && s.selectedId) s.commit(removeElement(s.doc, s.selectedId));
    },
    onUndo: () => useCanvas.getState().undo(),
    onRedo: () => useCanvas.getState().redo(),
    onPaste: (r) => applyPaste(r),
  });
```

(`applyPaste`가 `if (!doc) return null;` 아래에 정의돼 있으면 훅에서 쓸 수 없으므로, `add`·`applyPaste`·`textBase`를 `useCanvas.getState()`로 최신 문서를 읽는 형태로 만들어 훅 위로 올린다. `add`는 이미 Task 11에서 `useCanvas.getState().doc`을 쓰도록 바꿨다.)

- [ ] **Step 4: 확인 후 커밋**

Run: `npx tsc --noEmit && npx jest`
Expected: 통과.

```bash
git add src/features/canvas
git commit -m "feat: 캔버스 붙여넣기(이미지·GIF·텍스트, 앱·웹)와 웹 단축키

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 최종 점검·설계 문서 보정

**Files:**
- Modify: `docs/superpowers/specs/2026-10-16-canvas-cover-and-view-modes-design.md`

- [ ] **Step 1: 설계 문서 보정**

설계 문서에 다음을 반영한다.
- 0장 구현 방식: 추가 패키지에서 `react-native-reanimated`(+worklets)를 지우고 "제스처 중 값은 JS 상태로 처리(요소 30개 이하라 충분), 필요해지면 reanimated 도입"을 적는다.
- 2-2 연결 텍스트 `bind` 값: `요일(영문)`, `예식 일시`를 추가(표지 프리셋이 쓴다). 툴바 이름은 "정보 글자".
- 2-1 조작: "선택하면 오른쪽 아래 손잡이로도 크기·회전(웹 마우스·한 손 조작)" 추가.
- 3장 데이터: `BindKey`에 `'weekday' | 'datetime'` 추가, `canvasStore`(선택·도구·기록) 명시.
- 5장 표: 동영상 확장자 오류 문구 "mp4·mov 영상만 올릴 수 있어요." 추가.
- 6장 보완 목록에 "독바 썸네일을 실제 축소 미리보기로" 추가.

- [ ] **Step 2: 전체 검사**

Run: `npx tsc --noEmit && npx jest && npx expo lint && npx expo-doctor`
Expected: 타입 오류 0, 모든 테스트 통과, 린트 오류 0(경고는 확인 후 판단), doctor 통과. `expo lint`가 처음이라 설정 파일을 만들겠다고 하면 만들고 그 파일도 커밋한다.

- [ ] **Step 3: 브라우저 점검 (사용자에게 서버 켜도 되는지 먼저 묻는다)**

서버: `cd "/c/Users/oh34s/invite app" && CI=false npx expo start --web --port 8081 --clear` (백그라운드, 로그는 scratchpad). Playwright MCP로:
1. 결혼식 템플릿 미리보기 → [스토리형]/[스크롤형] 전환 → [이 템플릿으로 만들기] → 스타일 선택 모달 → Step3·4 → Step5.
2. Step5: 독바로 슬라이드 이동, 슬라이드 좌우 밀기, 슬라이드 눌러 입력 시트, [기본정보] 칩, 빨간 점.
3. 표지 [직접 꾸미기]: 텍스트 추가·수정(더블탭), 끌어서 이동 + 가운데 가이드선, 손잡이로 크기·회전, 서체·색·크기·정렬, 복제·앞뒤·삭제, 스티커·장식 글자, 정보 글자, 배경 색, 펜 그리기·지우개, Ctrl+V 텍스트 붙여넣기, Ctrl+Z/Ctrl+Shift+Z, Delete, [완료].
4. [템플릿 원래대로] 확인 모달 → 형식 표지로.
5. 설정(⚙)에서 보기 형태 바꾸기 → 미리보기(👁).
6. 최종저장 → `/invite/[id]`: 스토리형 탭·밀기·페이지 막대, 방명록 쓰기 동작, 스크롤형 전환 저장 후 확인.
7. 화면 폭 360×640, 412×915, 600×700(폴드 펼침), 1280×800에서 `/invite/[id]` 스크린샷: 잘림 없음, 600 이상 화살표·←/→ 키.
8. 새로고침 후 GIF·동영상 자리 회색 상자 확인(웹).
찾은 문제는 고치고 해당 작업 방식대로 테스트를 더한다.

- [ ] **Step 4: 커밋**

```bash
git add -A docs src
git commit -m "docs: 구현에 맞춰 캔버스 설계 보정, 최종 점검 수정

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: 확인 못 한 것 정리**

사용자에게 보고할 때 "실제 폰(Expo Go)에서 두 손가락 핀치·회전, iOS 붙여넣기 허용 창, 동영상 재생, GIF 원본 유지"는 화면으로 확인하지 못했다고 분명히 적는다.
