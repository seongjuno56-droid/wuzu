import { getTemplate, getTemplates, TEMPLATES_PER_THEME } from '../templates';
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
