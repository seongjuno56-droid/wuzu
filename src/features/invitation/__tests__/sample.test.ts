import { DolContent, LIMITS, validateSection } from '../model';
import { sampleInvitation } from '../sample';
import { sectionTabs, validateFor } from '../themes';

describe('템플릿 미리보기 예시', () => {
  it('인사말·갤러리·엔딩에 예시 사진이 들어 있다', () => {
    const c = sampleInvitation('wedding', 'wedding-1').content;
    expect(c.greeting.photo).toEqual(expect.any(String));
    expect(c.gallery.photos.length).toBeGreaterThanOrEqual(LIMITS.galleryMin);
    expect(c.gallery.photos.every((p) => typeof p === 'string' && p.length > 0)).toBe(true);
    expect(c.ending.photos.length).toBeGreaterThan(0);
  });
  it('예시 갤러리는 입력 검사를 통과한다', () => {
    expect(validateSection('gallery', sampleInvitation('wedding', 'wedding-1').content)).toEqual([]);
  });
  it('돌잔치 예시: 모든 입력 탭이 검사를 통과하고 사진이 들어 있다', () => {
    const inv = sampleInvitation('dol', 'dol-1');
    expect(inv.themeId).toBe('dol');
    for (const k of sectionTabs(inv)) expect([k, validateFor(inv, k)]).toEqual([k, []]);
    const c = inv.content as DolContent;
    expect(c.basic.photo).toEqual(expect.any(String));
    expect(c.timeline.items).toHaveLength(4);
    expect(c.timeline.items.every((i) => !!i.photo)).toBe(true);
    expect(c.gallery.photos.length).toBeGreaterThanOrEqual(LIMITS.galleryMin);
  });
});
