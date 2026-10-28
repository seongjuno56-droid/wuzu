import { addItem, removeItem, updateItem } from '../editor/listOps';

const a = { id: 'a', v: 1 };
const b = { id: 'b', v: 2 };

describe('목록형 입력', () => {
  it('최대 개수면 더하지 않는다', () => {
    expect(addItem([a], b, 2)).toEqual([a, b]);
    expect(addItem([a, b], { id: 'c', v: 3 }, 2)).toEqual([a, b]);
  });
  it('지우기·고치기는 id 로', () => {
    expect(removeItem([a, b], 'a')).toEqual([b]);
    expect(updateItem([a, b], 'b', { v: 9 })).toEqual([a, { id: 'b', v: 9 }]);
  });
});
