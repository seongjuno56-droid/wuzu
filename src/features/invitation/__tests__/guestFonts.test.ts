import * as Font from 'expo-font';

import { fonts } from '../../../theme';
import { GUEST_FONT_DELAY_MS, loadGuestFonts, loadGuestFontsLater } from '../guestFonts';

jest.mock('expo-font', () => ({
  FontDisplay: { SWAP: 'swap' },
  isLoaded: jest.fn(() => false),
  loadAsync: jest.fn(async () => {}),
}));

const loadAsync = Font.loadAsync as jest.Mock;
const isLoaded = Font.isLoaded as jest.Mock;
const families = () => loadAsync.mock.calls.flatMap(([m]) => Object.keys(m));

beforeEach(() => {
  jest.clearAllMocks();
  isLoaded.mockReturnValue(false);
});

describe('하객 화면 글꼴', () => {
  it('룩이 쓰는 글꼴만 swap 으로 받는다', () => {
    loadGuestFonts({ regular: fonts.serif, bold: fonts.serifBold });
    expect(families()).toEqual([fonts.serif, fonts.serifBold]);
    expect(loadAsync.mock.calls[0][0][fonts.serif].display).toBe('swap');
  });
  it('굵기가 하나인 서체는 한 번만 받는다', () => {
    loadGuestFonts({ regular: fonts.round, bold: fonts.roundBold });
    expect(families()).toEqual([fonts.round]);
  });
  it('이미 읽힌 글꼴은 받지 않는다 (앱)', () => {
    isLoaded.mockReturnValue(true);
    loadGuestFonts({ regular: fonts.regular, bold: fonts.semibold });
    expect(loadAsync).not.toHaveBeenCalled();
  });
  it('표지 사진과 대역을 다투지 않게 조금 뒤에 받고, 화면이 사라지면 받지 않는다', () => {
    jest.useFakeTimers();
    try {
      const look = { regular: fonts.serif, bold: fonts.serifBold };
      loadGuestFontsLater(look);
      expect(loadAsync).not.toHaveBeenCalled();
      jest.advanceTimersByTime(GUEST_FONT_DELAY_MS);
      expect(families()).toEqual([fonts.serif, fonts.serifBold]);
      loadAsync.mockClear();
      const cancel = loadGuestFontsLater(look);
      cancel();
      jest.advanceTimersByTime(GUEST_FONT_DELAY_MS);
      expect(loadAsync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it('못 받아도 던지지 않는다', async () => {
    loadAsync.mockRejectedValue(new Error('offline'));
    expect(() => loadGuestFonts({ regular: fonts.regular, bold: fonts.semibold })).not.toThrow();
    await Promise.resolve();
  });
});
