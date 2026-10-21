import { DEFAULT_ENABLED, DEFAULT_ORDER } from '../model';
import { createInvitation, sectionTabs, themeDef, validateFor } from '../themes';

describe('테마 정의', () => {
  it('결혼식: 입력 탭·기본값이 전과 같다', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' });
    expect(sectionTabs(inv)).toEqual(['basic', 'ceremony', 'greeting', 'account', 'gallery', 'guestbook', 'ending']);
    expect(inv.enabled).toEqual(DEFAULT_ENABLED);
    expect(inv.order).toEqual(DEFAULT_ORDER);
    expect(validateFor(inv, 'basic')).toEqual(['groom', 'bride']);
  });
  it('모르는 테마 id 는 결혼식 정의로 연다 (앱이 멈추지 않게)', () => {
    expect(themeDef('nope').id).toBe('wedding');
  });
  it('결혼식 라벨', () => {
    expect(themeDef('wedding').sectionLabel('ceremony')).toBe('예식정보');
    expect(themeDef('wedding').pageLabel('ceremony')).toBe('예식 정보');
  });
});
