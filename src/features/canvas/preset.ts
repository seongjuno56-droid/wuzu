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
