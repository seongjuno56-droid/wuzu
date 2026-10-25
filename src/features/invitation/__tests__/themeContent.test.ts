import { asWedding, defaultContent, isCorporate, isDol, InvitationContent, isWedding, withGallery } from '../model';
import type { CorporateContent } from '../model';

describe('테마별 콘텐츠', () => {
  it('theme 필드가 없는 옛 저장본은 결혼식', () => {
    const old = defaultContent() as InvitationContent;
    delete (old as { theme?: string }).theme;
    expect(isDol(old)).toBe(false);
    expect(asWedding(old).basic.groom.title).toBe('아들');
  });
  it('돌잔치 콘텐츠를 결혼식으로 읽으려 하면 오류', () => {
    const dol = { theme: 'dol' } as InvitationContent;
    expect(isDol(dol)).toBe(true);
    expect(() => asWedding(dol)).toThrow('결혼식 초대장이 아니에요');
  });
});

describe('기업 행사 콘텐츠 구분', () => {
  const corp = { theme: 'corporate' } as CorporateContent;
  it('theme 으로 기업·결혼식을 가른다', () => {
    expect(isCorporate(corp)).toBe(true);
    expect(isWedding(corp)).toBe(false);
    expect(isWedding(defaultContent())).toBe(true);
  });
  it('기업에는 갤러리 부품을 쓰지 않는다', () => {
    expect(() => withGallery(corp)).toThrow();
    expect(() => asWedding(corp)).toThrow();
  });
});
