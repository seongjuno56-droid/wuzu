import { compressPhoto, encodePhoto, makePhotoThumb, PHOTO_MAX_SIDE, THUMB_MAX_SIDE } from '../media';

const mockSave = jest.fn();
const mockResize = jest.fn();
let mockSize = { width: 4000, height: 3000 };

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: () => ({
      resize: mockResize,
      renderAsync: async () => ({ ...mockSize, saveAsync: mockSave }),
    }),
  },
}));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSize = { width: 4000, height: 3000 };
  mockSave.mockImplementation(async ({ format }: { format: string }) => ({ uri: `file:///out.${format}` }));
});

describe('사진 변환', () => {
  it('본 이미지는 긴 변 1080px WebP 다', async () => {
    expect(await compressPhoto('file:///a.jpg')).toBe('file:///out.webp');
    expect(PHOTO_MAX_SIDE).toBe(1080);
    expect(mockResize).toHaveBeenCalledWith({ width: 1080, height: null });
  });

  it('세로 사진은 높이를 줄이고, 작은 사진은 늘리지 않는다', async () => {
    mockSize = { width: 3000, height: 4000 };
    await compressPhoto('file:///a.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: null, height: 1080 });

    mockResize.mockClear();
    mockSize = { width: 300, height: 200 };
    await compressPhoto('file:///a.jpg');
    expect(mockResize).not.toHaveBeenCalled();
  });

  it('WebP 저장이 실패하면 JPEG 로 대체한다', async () => {
    mockSave.mockImplementationOnce(async () => {
      throw new Error('지원 안 함');
    });
    expect(await compressPhoto('file:///a.jpg')).toBe('file:///out.jpeg');
  });

  it('JPEG 대체까지 실패하면 던져서 원본을 쓰게 한다', async () => {
    mockSave.mockRejectedValue(new Error('깨진 파일'));
    await expect(compressPhoto('file:///a.jpg')).rejects.toThrow('깨진 파일');
  });

  it('작은 사진은 긴 변 400px 이고 본 이미지와 같은 형식이다', async () => {
    expect(THUMB_MAX_SIDE).toBe(400);
    expect(await makePhotoThumb('file:///a.jpg', 'image/jpeg')).toBe('file:///out.jpeg');
    expect(await makePhotoThumb('file:///a.png', 'image/png')).toBe('file:///out.png');
    expect(await makePhotoThumb('file:///a.webp', 'image/webp')).toBe('file:///out.webp');
    expect(mockResize).toHaveBeenCalledWith({ width: 400, height: null });
  });

  it('PNG 를 지정하면 PNG 로 둔다(투명 로고)', async () => {
    expect(await encodePhoto('file:///logo.png', { maxSide: PHOTO_MAX_SIDE, format: 'png' })).toBe('file:///out.png');
  });
});
