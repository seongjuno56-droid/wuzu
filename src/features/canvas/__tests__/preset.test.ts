import { getTemplates } from '../../../data/templates';
import { CANVAS_LIMITS } from '../model';
import { canvasForEditing, coverPreset } from '../preset';

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

describe('canvasForEditing', () => {
  const style = getTemplates('wedding')[0].style;
  it('꾸민 적 없으면 프리셋 복사본 — 원본 프리셋과 따로 논다', () => {
    const doc = canvasForEditing(undefined, style);
    expect(doc).toEqual(coverPreset(style));
    doc.elements.pop();
    expect(coverPreset(style).elements.length).toBe(doc.elements.length + 1);
  });
  it('이미 꾸몄으면 그 캔버스', () => {
    const canvas = coverPreset(style);
    expect(canvasForEditing({ mode: 'canvas', canvas }, style)).toBe(canvas);
  });
});
