import { asWedding, defaultContent, isDol, InvitationContent } from '../model';

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
