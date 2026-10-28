import { releasePage, settledPageIndex, swipeStep, tapSide } from '../view/storyNav';

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
  it('마우스로 끈 거리로 넘길 방향 (왼쪽으로 끌면 다음 장)', () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(90, -3)).toBe(-1);
    expect(swipeStep(-20, 0)).toBe(0); // 짧게 움직인 건 탭
    expect(swipeStep(-60, 80)).toBe(0); // 세로로 더 움직이면 스크롤
  });
  it('끌다 놓으면: 조금만 끌어도 끈 방향 한 장, 많이 끌면 가까운 장, 끝에서 멈춤', () => {
    // 시작 장, 끈 거리 dx(왼쪽 음수), dy, 장 폭, 장 수
    expect(releasePage(0, -60, 0, 400, 5)).toBe(1);
    expect(releasePage(2, 70, 0, 400, 5)).toBe(1);
    expect(releasePage(0, -650, 0, 400, 5)).toBe(2); // 1.6장 끌면 가까운 2장
    expect(releasePage(1, -20, 0, 400, 5)).toBe(1); // 짧으면 제자리로
    expect(releasePage(4, -300, 0, 400, 5)).toBe(4); // 마지막 장에서 더 못 감
    expect(releasePage(0, 300, 0, 400, 5)).toBe(0);
  });
});
