/**
 * 캔버스(직접 꾸미기) 순수 로직 — 제한, 연결 텍스트, 좌표 계산, 문서 조작, 미디어 검사
 * (설계: docs/superpowers/specs/2026-10-16-canvas-cover-and-view-modes-design.md)
 */
import { fonts } from '../../theme';
import { formatDateTimeLine, formatKoreanTime, InvitationContent, parseDate, WEEKDAYS_EN } from '../invitation/model';
import type { BindKey, CanvasDoc, CanvasElement, ElementKind, FontKey, StrokeElement, TextElement } from './types';

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
        text: formatDateTimeLine(d, c.ceremony.time),
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

// ── 인스타 스토리식 편집 ───────────────────────────────

/**
 * 그 자리 글자 입력을 마칠 때: 새 글자는 쓴 게 있을 때만 더하고,
 * 있던 글자는 바꾸거나(서체·색 포함) 다 지웠으면 요소를 지운다.
 */
export function finishTextEdit(doc: CanvasDoc, el: TextElement, isNew: boolean, raw: string): CanvasDoc {
  const text = raw.trim().slice(0, CANVAS_LIMITS.text);
  if (isNew) return text ? addElement(doc, { ...el, text }) : doc;
  if (!text) return removeElement(doc, el.id);
  return { ...doc, elements: doc.elements.map((e) => (e.id === el.id ? { ...el, text } : e)) };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 점이 상자 안인가 (휴지통 판정) */
export const inRect = (p: { x: number; y: number }, r: Rect | null) =>
  !!r && p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

/** 화면에서 누른 점 → 슬라이드 비율 좌표. 슬라이드 밖이면 가운데 */
export function tapToSlide(p: { x: number; y: number }, slide: Rect): { x: number; y: number } {
  if (!inRect(p, slide) || slide.width <= 0 || slide.height <= 0) return { x: 0.5, y: 0.5 };
  return { x: (p.x - slide.x) / slide.width, y: (p.y - slide.y) / slide.height };
}
