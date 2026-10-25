import type { TemplateStyle } from '../../data/templates';
import type { BindKey, CanvasDoc, CanvasElement, FontKey, PhotoFrame, SlideDesign } from './types';

/** 360px 폭 기준 px → 슬라이드 폭 대비 비율 */
const u = (px: number) => px / 360;

/**
 * 템플릿 표지(형식 모드)의 배치. 형식 표지도 이 프리셋을 그대로 그리므로
 * [직접 꾸미기]로 바꿔도 모습이 달라지지 않는다.
 */
export function coverPreset(style: TemplateStyle, themeId = 'wedding'): CanvasDoc {
  const serif = style.font === 'serif';
  const round = style.font === 'round';
  const regular: FontKey = round ? 'round' : serif ? 'serif' : 'sans';
  const bold: FontKey = round ? 'round' : serif ? 'serifBold' : 'sansBold';

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

  if (themeId === 'dol') return dolCover(style, text, bound);
  if (themeId === 'corporate') return corporateCover(style, text, bound, rule);

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
  if (style.cover === 'frame') elements.unshift(frameBox(style));
  return { background: { kind: 'template' }, elements };
}

/** 바깥 여백 20px 테두리: 상자 폭 = 1 - 2·(20/360), 높이 = 16/9 - 2·(20/360) (폭 단위) */
function frameBox(style: TemplateStyle): CanvasElement {
  const w = 1 - 2 * u(20);
  const h = 16 / 9 - 2 * u(20);
  return {
    id: 'preset-frame', kind: 'stroke', x: 0.5, y: 0.5, w, rotation: 0, aspect: h / w,
    points: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], color: style.accent, width: u(1),
  };
}

type Maker = (id: string, value: string, y: number, px: number, color: string, isBold?: boolean) => CanvasElement;
type BoundMaker = (id: string, bind: BindKey, y: number, px: number, color: string, isBold?: boolean) => CanvasElement;

/** 돌잔치 표지: Happy First BIRTHDAY + 템플릿 사진 틀 + 이름·일시·장소·보호자 (설계 3장) */
function dolCover(style: TemplateStyle, text: Maker, bound: BoundMaker): CanvasDoc {
  const frame: PhotoFrame = style.frame ?? 'arch';
  const sparkle = style.sparkle ?? 'star';
  const mark = sparkle === 'heart' ? '♥' : sparkle === 'dot' ? '●' : sparkle === 'star' ? '✦' : '';
  const elements: CanvasElement[] = [
    text('preset-happy', 'H a p p y', 0.12, 12, style.accent),
    text('preset-first', 'First BIRTHDAY', 0.17, 26, style.accent, true),
    {
      id: 'preset-photo',
      kind: 'photo',
      bind: 'coverPhoto',
      x: 0.5,
      y: 0.42,
      w: 0.64,
      rotation: 0,
      // 원형은 정사각, 나머지는 세로로 조금 긴 틀
      aspect: frame === 'circle' ? 1 : 1.25,
      frame,
    },
    bound('preset-name', 'childName', 0.71, 22, style.fg, true),
    bound('preset-datetime', 'datetime', 0.77, 13, style.sub),
    bound('preset-venue', 'venue', 0.81, 13, style.sub),
    bound('preset-guardians', 'guardians', 0.87, 13, style.fg),
  ];
  if (mark) {
    // 이름 양옆 반짝이
    elements.push(
      { ...text('preset-mark-l', mark, 0.71, 14, style.accent), x: 0.2, w: 0.1 } as CanvasElement,
      { ...text('preset-mark-r', mark, 0.71, 14, style.accent), x: 0.8, w: 0.1 } as CanvasElement,
    );
  }
  return { background: { kind: 'template' }, elements };
}

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

/**
 * [직접 꾸미기]를 열 때 편집기에 넘길 캔버스. 꾸민 적 없으면 프리셋의 깊은 복사본.
 * 초안에는 [완료] 때만 넣는다 — 취소하면 아무것도 바뀌지 않는다.
 */
export function canvasForEditing(design: SlideDesign | undefined, style: TemplateStyle, themeId = 'wedding'): CanvasDoc {
  if (design?.mode === 'canvas') return design.canvas;
  return JSON.parse(JSON.stringify(coverPreset(style, themeId))) as CanvasDoc;
}
