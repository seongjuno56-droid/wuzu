import * as Font from 'expo-font';

import { fontSources } from '../../theme';

export const GUEST_FONT_DELAY_MS = 1500;

/**
 * 공개 웹은 글꼴을 기다리지 않고 그리므로, 초대장의 룩이 쓰는 글꼴만 뒤에서 받는다.
 * swap 이라 받는 동안 글자가 시스템 글꼴로 보인다(auto 면 브라우저가 글자를 3초까지 숨겨 표지가 늦는다).
 * 못 받아도 시스템 글꼴로 계속 쓴다.
 */
export function loadGuestFonts(look: { regular: string; bold: string }): void {
  for (const family of new Set([look.regular, look.bold])) {
    const uri = (fontSources as Record<string, number>)[family];
    if (!uri || Font.isLoaded(family)) continue;
    Font.loadAsync({ [family]: { uri, display: Font.FontDisplay.SWAP } }).catch(() => {});
  }
}

/** 표지 사진과 대역을 다투지 않게 조금 뒤에 받는다. 돌려준 함수로 취소한다 */
export function loadGuestFontsLater(look: { regular: string; bold: string }): () => void {
  const timer = setTimeout(() => loadGuestFonts(look), GUEST_FONT_DELAY_MS);
  return () => clearTimeout(timer);
}
