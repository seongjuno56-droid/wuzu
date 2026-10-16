import { dropIndex, moveItem } from '../sortable';

describe('moveItem', () => {
  it('moves an item forward and backward without mutating', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });
  it('returns the same order when from === to', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('dropIndex', () => {
  const grid = { columns: 3, cellWidth: 100, cellHeight: 100, gap: 10, count: 7 };
  it('maps a dragged position to the nearest slot', () => {
    // 0번 칸에서 오른쪽으로 1칸 + 아래로 1칸
    expect(dropIndex({ ...grid, from: 0, dx: 112, dy: 105 })).toBe(4);
  });
  it('clamps to the list bounds', () => {
    expect(dropIndex({ ...grid, from: 0, dx: -500, dy: -500 })).toBe(0);
    expect(dropIndex({ ...grid, from: 0, dx: 900, dy: 900 })).toBe(6);
  });
  it('works for a single-column list', () => {
    expect(dropIndex({ columns: 1, cellWidth: 300, cellHeight: 56, gap: 8, count: 4, from: 1, dx: 10, dy: 70 })).toBe(2);
  });
});
