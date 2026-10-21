import { settledPageIndex, tapSide } from '../view/storyNav';

describe('스토리 넘김 계산', () => {
  it('스크롤이 장 경계에 멈췄을 때만 장 번호를 준다 (웹은 momentum 끝 이벤트가 없다)', () => {
    expect(settledPageIndex(0, 400, 5)).toBe(0);
    expect(settledPageIndex(800, 400, 5)).toBe(2);
    expect(settledPageIndex(800.4, 400, 5)).toBe(2);
    expect(settledPageIndex(610, 400, 5)).toBeNull(); // 넘기는 중
    expect(settledPageIndex(4000, 400, 5)).toBe(4); // 범위 밖은 끝 장
    expect(settledPageIndex(0, 0, 5)).toBeNull();
  });
  it('슬라이드 안 위치로 좌·우 1/3 판정', () => {
    expect(tapSide(50, 300)).toBe(-1);
    expect(tapSide(150, 300)).toBe(0);
    expect(tapSide(250, 300)).toBe(1);
  });
});
