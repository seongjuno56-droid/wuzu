/** 캔버스(직접 꾸미기)·보기 형태 타입 — 런타임 코드 없이 타입만 둔다 (초대장 모델이 가져다 쓴다) */

export type ViewMode = 'story' | 'scroll';

export type FontKey = 'sans' | 'sansBold' | 'serif' | 'serifBold' | 'round';
export type TextAlign = 'left' | 'center' | 'right';

/** 폼 값과 연결된 텍스트 — 글자는 그릴 때 폼 값으로 만든다 */
export type BindKey =
  | 'groomName'
  | 'brideName'
  | 'coupleNames'
  | 'date'
  | 'weekday'
  | 'datetime'
  | 'time'
  | 'venue'
  // 돌잔치
  | 'childName'
  | 'nickname'
  | 'guardians'
  | 'firstBirthday';

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
/** 돌잔치 표지 사진 틀 */
export type PhotoFrame = 'arch' | 'circle' | 'oval' | 'rounded' | 'cloud';
/** 폼의 사진(표지 사진)과 연결된 사진 칸 — 사진은 그릴 때 폼 값으로 */
export type PhotoElement = ElementBase & { kind: 'photo'; bind: 'coverPhoto'; aspect: number; frame: PhotoFrame };
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
  | StrokeElement
  | PhotoElement;

export type ElementKind = CanvasElement['kind'];

export interface CanvasDoc {
  background: CanvasBackground;
  /** 배열 순서 = 쌓는 순서 (뒤 → 앞) */
  elements: CanvasElement[];
}

export type SlideDesign = { mode: 'form' } | { mode: 'canvas'; canvas: CanvasDoc };
