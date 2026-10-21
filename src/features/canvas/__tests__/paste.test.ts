import * as Clipboard from 'expo-clipboard';

import { storeImage } from '../media';
import { readClipboard } from '../paste';

jest.mock('expo-clipboard', () => ({
  hasImageAsync: jest.fn(async () => true),
  getImageAsync: jest.fn(async () => ({ data: 'data:image/png;base64,AAAA', size: { width: 1000, height: 2000 } })),
  getStringAsync: jest.fn(async () => ''),
}));
jest.mock('../media', () => ({ storeImage: jest.fn(async () => 'stored://1') }));

describe('붙여넣기 이미지', () => {
  it('스크린샷 PNG 도 JPEG 로 줄여 저장한다 (웹 저장 용량)', async () => {
    const r = await readClipboard();
    expect(r).toEqual({ kind: 'image', uri: 'stored://1', aspect: 2 });
    expect(storeImage).toHaveBeenCalledWith(expect.any(String), { width: 1000, height: 2000, png: false });
    expect(Clipboard.getImageAsync).toHaveBeenCalledWith({ format: 'jpeg' });
  });
});
