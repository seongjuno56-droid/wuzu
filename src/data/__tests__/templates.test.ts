import { getTemplate, getTemplates, PALETTES, paletteOfTemplate, styleFor, TEMPLATES_PER_THEME } from '../templates';
import { THEMES } from '../themes';

describe('templates', () => {
  it.each(THEMES.map((t) => t.id))('has %s templates with unique ids', (themeId) => {
    const list = getTemplates(themeId);
    expect(list).toHaveLength(TEMPLATES_PER_THEME);
    expect(new Set(list.map((t) => t.id)).size).toBe(TEMPLATES_PER_THEME);
  });
  it('finds a template by theme and id', () => {
    const first = getTemplates('wedding')[0];
    expect(getTemplate('wedding', first.id)?.name).toBe(first.name);
  });
  it('returns nothing for unknown themes or ids', () => {
    expect(getTemplates('nope')).toEqual([]);
    expect(getTemplate('wedding', 'nope')).toBeUndefined();
  });
});

describe('색 조합 (배경색 고르기)', () => {
  it('템플릿 10종의 색으로 10가지 조합이 있다', () => {
    expect(PALETTES).toHaveLength(10);
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(10);
  });
  it('조합을 고르면 색만 바뀌고 서체·표지 배치는 템플릿 그대로', () => {
    const base = styleFor('wedding', 'wedding-1');
    const forest = PALETTES.find((p) => p.id === 'forest')!;
    const s = styleFor('wedding', 'wedding-1', 'forest');
    expect(s).toEqual({ ...base, bg: forest.bg, fg: forest.fg, sub: forest.sub, accent: forest.accent });
  });
  it('없거나 모르는 조합이면 템플릿 색', () => {
    expect(styleFor('wedding', 'wedding-1', null)).toEqual(styleFor('wedding', 'wedding-1'));
    expect(styleFor('wedding', 'wedding-1', 'nope')).toEqual(styleFor('wedding', 'wedding-1'));
  });
  it('템플릿 자기 색 조합을 알려 준다', () => {
    expect(paletteOfTemplate('wedding', 'wedding-2')).toBe('forest');
  });
});
