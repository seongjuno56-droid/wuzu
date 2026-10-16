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
