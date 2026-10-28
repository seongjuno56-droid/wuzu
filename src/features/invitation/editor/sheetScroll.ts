import { createContext } from 'react';

/**
 * 입력 시트의 스크롤을 목록 끌기가 움직일 수 있게 하는 연결.
 * 끄는 카드가 시트 가장자리에 닿으면 목록이 시트를 스크롤한다 (끄는 동안 손 스크롤은 막혀 있다).
 */
export interface SheetScroll {
  /** dy 만큼 스크롤하고 실제로 움직인 양을 돌려준다 (끝에 닿으면 덜 움직인다) */
  scrollBy: (dy: number) => number;
  /** 시트의 보이는 영역 (화면 기준 y). 아직 모르면 null */
  viewport: () => { top: number; bottom: number } | null;
}

export const SheetScrollContext = createContext<SheetScroll | null>(null);
