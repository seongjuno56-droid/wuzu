import { moveItem } from '../../../lib/sortable';
import { ALWAYS_ON, Invitation, OptionalSection, PageKey, pageOrder, ReorderablePage, SectionKey } from '../model';

/** 슬라이드를 눌렀을 때 여는 입력 시트 */
export const PAGE_SECTION: Record<PageKey, SectionKey> = {
  cover: 'basic',
  greeting: 'greeting',
  gallery: 'gallery',
  ceremony: 'ceremony',
  guestbook: 'guestbook',
  account: 'account',
  ending: 'ending',
  profile: 'profile',
  timeline: 'timeline',
  program: 'program',
  speakers: 'speakers',
  directions: 'directions',
  rsvp: 'rsvp',
  contact: 'contact',
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

// ── 독바에서 꾹 눌러 끌어 순서 바꾸기 (표지·인사말은 맨 앞, 엔딩은 맨 끝 고정) ──

type OrderSource = Pick<Invitation, 'enabled' | 'order'>;

/** 독바에서 옮길 수 있는 장 (보이는 순서대로). 예식 정보(행사 개요)·오시는 길은 늘 켜져 있다 */
export const movablePages = (inv: OrderSource): ReorderablePage[] =>
  inv.order.filter((p) => ALWAYS_ON.includes(p) || inv.enabled[p as OptionalSection]);

/** 끈 거리(px) → 옮긴 칸 수. 반 칸 넘게 끌어야 한 칸 */
export const slotsMoved = (dx: number, pitch: number) => (pitch > 0 ? Math.round(dx / pitch) : 0);

/** page 를 slots 칸 옮긴 새 순서. 끝에서 멈추고, 꺼진 섹션은 뒤에 그대로 */
export function moveInDock(inv: OrderSource, page: ReorderablePage, slots: number): ReorderablePage[] {
  const visible = movablePages(inv);
  const hidden = inv.order.filter((p) => !visible.includes(p));
  const from = visible.indexOf(page);
  if (from < 0) return [...inv.order];
  const to = Math.max(0, Math.min(visible.length - 1, from + slots));
  return [...moveItem(visible, from, to), ...hidden];
}
