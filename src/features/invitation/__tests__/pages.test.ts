import { dockItems, itemDone, PAGE_SECTION } from '../editor/pages';
import { createInvitation } from '../model';

const inv = () => createInvitation({ id: 'i', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' });

describe('독바 항목', () => {
  it('페이지 순서대로 + 끝에 기본정보, BGM 은 켰을 때만', () => {
    const i = inv();
    expect(dockItems(i).map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
      'cover', 'greeting', 'gallery', 'ceremony', 'guestbook', 'account', 'ending', 'info:basic',
    ]);
    i.enabled.bgm = true;
    i.enabled.gallery = false;
    expect(dockItems(i).map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
      'cover', 'greeting', 'ceremony', 'guestbook', 'account', 'ending', 'info:basic', 'info:bgm',
    ]);
  });
  it('표지는 기본정보 섹션에 묶인다', () => {
    expect(PAGE_SECTION.cover).toBe('basic');
  });
  it('완료 여부는 연결된 섹션의 ✓ 확인으로 정한다', () => {
    const i = inv();
    const cover = dockItems(i)[0];
    expect(itemDone(i, cover)).toBe(false);
    i.completed.basic = true;
    expect(itemDone(i, cover)).toBe(true);
  });
});
