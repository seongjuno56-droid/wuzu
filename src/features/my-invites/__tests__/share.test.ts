import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { toast } from '../../../components/Toast';
import type { Invitation } from '../../invitation/model';
import { guestUrl, shareInvitation } from '../share';

let mockUsingMock = false;

jest.mock('../../../services', () => ({
  get usingMockAuth() {
    return mockUsingMock;
  },
}));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `wuzu://${path.replace(/^\//, '')}` }));

const inv = (slug?: string) => ({ id: 'i1', name: '우리 결혼합니다', slug }) as Invitation;
const WEB = 'https://guest.example.kr';
const NO_URL = '공유 주소를 만들지 못했어요. 잠시 후 다시 시도해 주세요.';
const FAILED = '공유하지 못했어요. 잠시 후 다시 시도해 주세요.';
const setPlatform = (os: string) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

let shareSpy: jest.SpyInstance;
const realOs = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockUsingMock = false;
  process.env.EXPO_PUBLIC_GUEST_WEB_URL = WEB;
  shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_GUEST_WEB_URL;
  setPlatform(realOs);
  shareSpy.mockRestore();
});

describe('guestUrl', () => {
  it('slug 가 있으면 웹 주소를 만든다', () => {
    expect(guestUrl(inv('abc123'))).toBe(`${WEB}/i/abc123`);
  });
  it('slug 가 없으면 null', () => {
    expect(guestUrl(inv())).toBeNull();
  });
  it('주소 끝 슬래시를 정리한다', () => {
    process.env.EXPO_PUBLIC_GUEST_WEB_URL = `${WEB}//`;
    expect(guestUrl(inv('abc123'))).toBe(`${WEB}/i/abc123`);
  });
  it('웹 주소 환경 변수가 없거나 비어 있으면 null', () => {
    delete process.env.EXPO_PUBLIC_GUEST_WEB_URL;
    expect(guestUrl(inv('abc123'))).toBeNull();
    process.env.EXPO_PUBLIC_GUEST_WEB_URL = '  ';
    expect(guestUrl(inv('abc123'))).toBeNull();
  });
});

describe('shareInvitation', () => {
  it('공유 문구는 이름과 웹 주소다', async () => {
    await shareInvitation(inv('abc123'));
    expect(shareSpy).toHaveBeenCalledWith({ message: `우리 결혼합니다\n${WEB}/i/abc123` });
    expect(toast).not.toHaveBeenCalled();
  });

  it('mock 모드(웹 주소 환경 변수 없음)에서는 지금처럼 앱 주소를 쓴다', async () => {
    mockUsingMock = true;
    delete process.env.EXPO_PUBLIC_GUEST_WEB_URL;
    await shareInvitation(inv('abc123'));
    expect(shareSpy).toHaveBeenCalledWith({ message: '우리 결혼합니다\nwuzu://invite/i1' });
  });

  it('mock 모드는 웹 주소가 있어도 앱 주소를 쓴다 (mock 의 slug 는 서버에 없다)', async () => {
    mockUsingMock = true;
    await shareInvitation(inv('abc123'));
    expect(shareSpy).toHaveBeenCalledWith({ message: '우리 결혼합니다\nwuzu://invite/i1' });
  });

  it('실서버인데 웹 주소 환경 변수가 없으면 앱 주소로 보내지 않고 안내만 한다', async () => {
    delete process.env.EXPO_PUBLIC_GUEST_WEB_URL;
    await shareInvitation(inv('abc123'));
    expect(shareSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(NO_URL);
  });

  it('실서버인데 slug 가 없으면 안내만 한다', async () => {
    await shareInvitation(inv());
    expect(shareSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(NO_URL);
  });

  it('공유 시트를 그냥 닫으면 안내 없이 끝난다', async () => {
    shareSpy.mockResolvedValue({ action: 'dismissedAction', activityType: undefined });
    await expect(shareInvitation(inv('abc123'))).resolves.toBeUndefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it('공유 시트가 실패하면 안내하고 예외를 던지지 않는다', async () => {
    shareSpy.mockRejectedValue(new Error('실패'));
    await expect(shareInvitation(inv('abc123'))).resolves.toBeUndefined();
    expect(toast).toHaveBeenCalledWith(FAILED);
  });

  it('웹은 주소를 복사한다', async () => {
    setPlatform('web');
    await shareInvitation(inv('abc123'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(`${WEB}/i/abc123`);
    expect(shareSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('주소를 복사했어요.');
  });

  it('웹에서 복사가 실패하면 안내한다', async () => {
    setPlatform('web');
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('권한 없음'));
    await expect(shareInvitation(inv('abc123'))).resolves.toBeUndefined();
    expect(toast).toHaveBeenCalledWith(FAILED);
  });
});
