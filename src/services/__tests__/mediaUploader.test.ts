import type { SupabaseClient } from '@supabase/supabase-js';

import type { Invitation } from '../../features/invitation/model';
import { createInvitation } from '../../features/invitation/themes';
import { MediaUploadError } from '../media/uploadDraftMedia';
import { createMediaUploader } from '../supabase/mediaUploader';

jest.mock('../../features/invitation/media', () => ({
  compressPhoto: jest.fn(async (u: string) => u),
  makePhotoThumb: jest.fn(async (u: string) => `${u}.thumb.webp`),
}));

const ID = '11111111-2222-4333-8444-555555555555';
const KEY = `invitations/${ID}/${'a'.repeat(32)}.mp3`;

const withBgm = (): Invitation => {
  const inv = createInvitation({ id: ID, ownerId: 'u', themeId: 'meetup', templateId: 'meetup-1' });
  return { ...inv, content: { ...inv.content, bgm: { uri: 'file:///s.mp3', fileName: 's.mp3', muteColor: 'white' } } as Invitation['content'] };
};

describe('createMediaUploader', () => {
  const realFetch = global.fetch;
  const saved = process.env.EXPO_PUBLIC_MEDIA_BASE_URL;
  const fetchMock = jest.fn();
  const typed = { type: 'audio/mpeg', size: 10 };
  const blob = { type: 'audio/x-wav', size: 10, slice: jest.fn(() => typed) };

  beforeEach(() => {
    jest.clearAllMocks();
    blob.slice.mockImplementation(() => typed);
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = 'https://media.example';
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? { ok: true, status: 200 } : { blob: async () => blob },
    );
  });
  afterAll(() => {
    global.fetch = realFetch;
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = saved;
  });

  const client = (answer: { data?: unknown; error?: unknown }) => {
    const invoke = jest.fn(async () => ({ data: answer.data ?? null, error: answer.error ?? null }));
    return { invoke, client: { functions: { invoke } } as unknown as SupabaseClient };
  };
  const signed = { key: KEY, url: 'https://r2/put', headers: { 'content-type': 'audio/mpeg', 'content-length': '10' } };

  it('sign-upload 에 묻고, 받은 주소에 받은 헤더로 PUT 한다', async () => {
    const c = client({ data: signed });
    const out = await createMediaUploader(c.client)(withBgm());
    expect(c.invoke).toHaveBeenCalledWith('sign-upload', {
      body: { invitationId: ID, kind: 'bgm', contentType: 'audio/mpeg', bytes: 10 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://r2/put',
      expect.objectContaining({ method: 'PUT', headers: signed.headers, body: typed, signal: expect.anything() }),
    );
    // 안드로이드는 Blob 자신의 형식이 헤더를 덮어쓴다. 서명한 형식과 다르면 언제나 403 이다
    expect(blob.slice).toHaveBeenCalledWith(0, 10, 'audio/mpeg');
    expect((out.content as never as { bgm: { uri: string } }).bgm.uri).toBe(`https://media.example/${KEY}`);
  });

  it('서명이 거절되거나 R2 가 실패로 답하면 실패다. 저장소 주소 환경 변수가 없어도 실패다', async () => {
    await expect(createMediaUploader(client({ error: new Error('403') }).client)(withBgm())).rejects.toBeInstanceOf(MediaUploadError);

    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === 'PUT' ? { ok: false, status: 403 } : { blob: async () => blob },
    );
    await expect(createMediaUploader(client({ data: signed }).client)(withBgm())).rejects.toBeInstanceOf(MediaUploadError);

    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === 'PUT' ? { ok: true, status: 200 } : { blob: async () => blob },
    );
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = '';
    await expect(createMediaUploader(client({ data: signed }).client)(withBgm())).rejects.toBeInstanceOf(MediaUploadError);
  });

  it('같은 올리기 함수로 다시 부르면 이미 올린 파일을 다시 올리지 않는다', async () => {
    const c = client({ data: signed });
    const upload = createMediaUploader(c.client);
    await upload(withBgm());
    await upload(withBgm());
    expect(c.invoke).toHaveBeenCalledTimes(1);
  });
});
