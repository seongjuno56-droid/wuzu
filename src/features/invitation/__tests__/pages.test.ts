import { dockItems, itemDone, moveInDock, movablePages, PAGE_SECTION, slotsMoved } from '../editor/pages';
import { pageOrder, ReorderablePage } from '../model';
import { createInvitation } from '../themes';

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

describe('독바에서 끌어 순서 바꾸기', () => {
  const inv = {
    enabled: { account: true, gallery: true, guestbook: true, ending: true, bgm: false },
    order: ['gallery', 'ceremony', 'guestbook', 'account'] as ReorderablePage[],
  };
  it('옮길 수 있는 장만 고른다 (표지·인사말·엔딩 고정, 꺼진 섹션 제외)', () => {
    expect(movablePages(inv)).toEqual(['gallery', 'ceremony', 'guestbook', 'account']);
    expect(movablePages({ ...inv, enabled: { ...inv.enabled, gallery: false } })).toEqual([
      'ceremony',
      'guestbook',
      'account',
    ]);
  });
  it('끈 칸 수만큼 옮기고, 꺼진 섹션은 뒤에 그대로 둔다', () => {
    // 갤러리를 오른쪽으로 두 칸
    expect(moveInDock(inv, 'gallery', 2)).toEqual(['ceremony', 'guestbook', 'gallery', 'account']);
    // 계좌를 왼쪽으로 멀리 → 맨 앞에서 멈춤
    expect(moveInDock(inv, 'account', -9)).toEqual(['account', 'gallery', 'ceremony', 'guestbook']);
    const off = { ...inv, enabled: { ...inv.enabled, gallery: false } };
    expect(moveInDock(off, 'account', -1)).toEqual(['ceremony', 'account', 'guestbook', 'gallery']);
  });
  it('끈 거리를 칸 수로 (반 칸 넘게 끌어야 한 칸)', () => {
    expect(slotsMoved(30, 64)).toBe(0);
    expect(slotsMoved(40, 64)).toBe(1);
    expect(slotsMoved(-130, 64)).toBe(-2);
  });
});

describe('돌잔치 독바', () => {
  it('표지·인사말 다음 아이 프로필·성장 이야기, 정보 칩은 기본정보', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'dol', templateId: 'dol-1' });
    expect(dockItems(inv).map((d) => (d.kind === 'page' ? d.page : `info:${d.section}`))).toEqual([
      'cover',
      'greeting',
      'profile',
      'timeline',
      'ceremony',
      'gallery',
      'guestbook',
      'account',
      'ending',
      'info:basic',
    ]);
    expect(movablePages(inv)).toEqual(['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account']);
    expect(PAGE_SECTION.profile).toBe('profile');
  });
});

describe('늘 켜진 장', () => {
  it('오시는 길은 enabled 와 상관없이 순서에 들어간다', () => {
    const order: ReorderablePage[] = ['ceremony', 'program', 'directions', 'rsvp'];
    expect(pageOrder({ program: true }, order)).toEqual(['cover', 'greeting', 'ceremony', 'program', 'directions']);
    expect(movablePages({ enabled: {}, order })).toEqual(['ceremony', 'directions']);
  });
});
