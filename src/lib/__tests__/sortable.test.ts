import { dropIndex, dropIndexByHeights, moveItem } from '../sortable';

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
    expect(dropIndex({ columns: 1, cellWidth: 300, cellHeight: 56, gap: 8, count: 4, from: 1, dx: 10, dy: 70 })).toBe(
      2,
    );
  });
});

describe('dropIndexByHeights (높이가 제각각인 세로 목록)', () => {
  // 높이 100·40·200·60, 간격 10 → 위치 0·110·160·370
  const base = { heights: [100, 40, 200, 60], gap: 10 };
  it('조금 움직이면 제자리', () => {
    expect(dropIndexByHeights({ ...base, from: 0, dy: 20 })).toBe(0);
    expect(dropIndexByHeights({ ...base, from: 2, dy: -20 })).toBe(2);
  });
  it('아래로: 끄는 카드 아래 끝이 다음 카드 가운데를 넘으면 그 자리', () => {
    // 0번 아래 끝 100+dy 가 1번 가운데(130)를 넘음
    expect(dropIndexByHeights({ ...base, from: 0, dy: 35 })).toBe(1);
    // 2번 가운데(260)를 넘음
    expect(dropIndexByHeights({ ...base, from: 0, dy: 170 })).toBe(2);
  });
  it('위로: 끄는 카드 위 끝이 앞 카드 가운데보다 올라가면 그 자리', () => {
    // 3번 위 끝 370+dy 가 2번 가운데(260)보다 위
    expect(dropIndexByHeights({ ...base, from: 3, dy: -120 })).toBe(2);
    expect(dropIndexByHeights({ ...base, from: 3, dy: -1000 })).toBe(0);
  });
  it('끝을 넘어가도 범위 안', () => {
    expect(dropIndexByHeights({ ...base, from: 0, dy: 5000 })).toBe(3);
  });
});
