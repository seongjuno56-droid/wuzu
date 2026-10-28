/** 스토리형·편집 슬라이드 넘김 계산 (화면 코드와 떼어 테스트한다) */

/**
 * 가로 스크롤 위치가 장 경계에 멈췄으면 그 장 번호, 넘기는 중이면 null.
 * 웹은 onMomentumScrollEnd 가 오지 않아 onScroll 로 판정한다 — 넘기는 도중에 번호를 바꾸면 되감기므로 경계에서만.
 */
export function settledPageIndex(offsetX: number, pageWidth: number, count: number): number | null {
  if (pageWidth <= 0 || count <= 0) return null;
  const i = Math.round(offsetX / pageWidth);
  if (Math.abs(offsetX - i * pageWidth) > 1) return null;
  return Math.max(0, Math.min(count - 1, i));
}

/** 슬라이드 안 x 로 넘길 방향: 왼쪽 1/3 → -1, 오른쪽 1/3 → 1, 가운데 → 0 */
export function tapSide(x: number, slideWidth: number): -1 | 0 | 1 {
  if (x < slideWidth / 3) return -1;
  if (x > (slideWidth * 2) / 3) return 1;
  return 0;
}

/** 입력칸에서 친 화살표는 넘김이 아니다 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || !!el.isContentEditable;
}

/** 이만큼(px) 이상 가로로 끌면 넘김 — 그보다 짧으면 탭으로 본다 */
export const SWIPE_MIN = 40;

/** 마우스로 끈 거리(dx·dy)로 넘길 방향: 왼쪽으로 끌면 다음 장(1), 오른쪽이면 이전 장(-1) */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dy) > Math.abs(dx)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * 끌다 놓았을 때 붙을 장: 끈 만큼 옮겨진 위치에서 가장 가까운 장.
 * 다만 짧게(SWIPE_MIN 이상) 끌어도 끈 방향으로 한 장은 넘긴다 — 휙 넘기는 느낌.
 */
export function releasePage(startIndex: number, dx: number, dy: number, pageWidth: number, count: number): number {
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  if (pageWidth <= 0) return clamp(startIndex);
  const nearest = clamp(Math.round(startIndex - dx / pageWidth));
  const step = swipeStep(dx, dy);
  return nearest === startIndex && step ? clamp(startIndex + step) : nearest;
}
