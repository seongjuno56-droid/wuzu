import { Invitation, PageKey, pageOrder, SectionKey } from '../model';

/** 슬라이드를 눌렀을 때 여는 입력 시트 */
export const PAGE_SECTION: Record<PageKey, SectionKey> = {
  cover: 'basic',
  greeting: 'greeting',
  gallery: 'gallery',
  ceremony: 'ceremony',
  guestbook: 'guestbook',
  account: 'account',
  ending: 'ending',
};

export type DockItem =
  | { kind: 'page'; page: PageKey; section: SectionKey }
  | { kind: 'info'; section: 'basic' | 'bgm' };

/** 하단 독바: 페이지 썸네일(순서대로) + 페이지가 없는 정보 칩 */
export function dockItems(inv: Pick<Invitation, 'enabled' | 'order'>): DockItem[] {
  const pages: DockItem[] = pageOrder(inv.enabled, inv.order).map((page) => ({ kind: 'page', page, section: PAGE_SECTION[page] }));
  const info: DockItem[] = [{ kind: 'info', section: 'basic' }];
  if (inv.enabled.bgm) info.push({ kind: 'info', section: 'bgm' });
  return [...pages, ...info];
}

export const itemDone = (inv: Pick<Invitation, 'completed'>, item: DockItem) => !!inv.completed[item.section];
