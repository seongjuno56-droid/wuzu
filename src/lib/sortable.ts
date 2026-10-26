/** from 위치의 항목을 to 위치로 옮긴 새 배열 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** 드래그한 거리(dx, dy)로 놓일 칸 번호를 계산 (격자 기준, 범위 안으로 제한) */
export function dropIndex(args: {
  from: number;
  dx: number;
  dy: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  count: number;
}): number {
  const { from, dx, dy, columns, cellWidth, cellHeight, gap, count } = args;
  const col = (from % columns) + Math.round(dx / (cellWidth + gap));
  const row = Math.floor(from / columns) + Math.round(dy / (cellHeight + gap));
  const clampedCol = Math.min(columns - 1, Math.max(0, col));
  const index = Math.max(0, row) * columns + clampedCol;
  return Math.min(count - 1, Math.max(0, index));
}

/**
 * 높이가 제각각인 세로 목록에서 dy 만큼 끌었을 때 놓일 칸 번호.
 * 아래로 끌면 카드 아래 끝이, 위로 끌면 위 끝이 이웃 카드의 가운데를 넘을 때 자리를 바꾼다.
 */
export function dropIndexByHeights(args: { heights: number[]; gap: number; from: number; dy: number }): number {
  const { heights, gap, from, dy } = args;
  const tops: number[] = [];
  heights.reduce((y, h) => (tops.push(y), y + h + gap), 0);
  const top = tops[from] + dy;
  const bottom = top + heights[from];
  let to = from;
  if (dy > 0) {
    for (let j = from + 1; j < heights.length; j++) if (bottom > tops[j] + heights[j] / 2) to = j;
  } else {
    for (let j = from - 1; j >= 0; j--) if (top < tops[j] + heights[j] / 2) to = j;
  }
  return to;
}

/**
 * 끄는 중 손가락이 보이는 영역 가장자리(zone px 안)에 있으면 스크롤할 양.
 * 가장자리에 가까울수록 빠르고(최대 max), 가운데면 0. 아래는 +, 위는 -.
 */
export function edgeScrollStep(fingerY: number, view: { top: number; bottom: number }, zone = 60, max = 12): number {
  const nearBottom = fingerY - (view.bottom - zone);
  if (nearBottom > 0) return Math.min(max, Math.ceil((nearBottom / zone) * max));
  const nearTop = view.top + zone - fingerY;
  if (nearTop > 0) return -Math.min(max, Math.ceil((nearTop / zone) * max));
  return 0;
}
