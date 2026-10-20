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
