import type { Invitation } from '../../features/invitation/model';
import { createInvitation } from '../../features/invitation/themes';
import { collectLocalMedia } from '../media/localMedia';
import { MediaUploadError, saveWithMedia, uploadDraftMedia, type SignRequest, type UploadDeps } from '../media/uploadDraftMedia';

const ID = '11111111-2222-4333-8444-555555555555';
const MB = 1024 * 1024;

const invitation = (paths: { photos?: string[]; photo?: string | null; bgm?: string | null; id?: string } = {}): Invitation => {
  const inv = createInvitation({ id: paths.id ?? ID, ownerId: 'u', themeId: 'meetup', templateId: 'meetup-1' });
  const c = inv.content as never as { basic: object; gallery: object; bgm: object };
  return {
    ...inv,
    content: {
      ...inv.content,
      basic: { ...c.basic, photo: paths.photo ?? null },
      gallery: { ...c.gallery, photos: paths.photos ?? [] },
      bgm: { ...c.bgm, uri: paths.bgm ?? null, fileName: paths.bgm ? '노래.mp3' : null },
    } as Invitation['content'],
  };
};
const photosOf = (inv: Invitation) => (inv.content as never as { gallery: { photos: string[] } }).gallery.photos;

function fakeDeps(patch: Partial<UploadDeps> = {}) {
  let n = 0;
  const failing = new Set<string>();
  const deps = {
    uploaded: new Map(),
    read: jest.fn(async (uri: string) => ({ body: uri as unknown as Blob, type: '', bytes: 1000 })),
    sign: jest.fn(async (r: SignRequest) => {
      n += 1;
      return { key: r.mainKey ? `${r.mainKey}.thumb` : `key${n}`, url: `https://put/${n}`, headers: { 'content-type': r.contentType } };
    }),
    put: jest.fn(async (_url: string, _h: Record<string, string>, body: Blob, _s: AbortSignal) => {
      if (failing.has(body as unknown as string)) throw new Error('끊김');
    }),
    recompress: jest.fn(async (uri: string) => `${uri}.small.webp`),
    makeThumb: jest.fn(async (uri: string, _type: string) => `${uri}.thumb.webp`),
    publicUrl: (key: string) => `https://media/${key}`,
    ...patch,
  };
  return { deps: deps as unknown as UploadDeps & Record<'sign' | 'put' | 'read' | 'recompress' | 'makeThumb', jest.Mock>, failing };
}

describe('uploadDraftMedia', () => {
  it('파일을 올리고 주소를 공개 주소로 바꾼 복사본을 돌려준다. 원본은 그대로다', async () => {
    const { deps } = fakeDeps();
    const inv = invitation({ photos: ['file:///a.webp'], bgm: 'file:///s.mp3' });
    const out = await uploadDraftMedia(inv, deps);
    expect(collectLocalMedia(out)).toEqual([]);
    expect(photosOf(out)[0]).toMatch(/^https:\/\/media\/key/);
    expect(photosOf(inv)).toEqual(['file:///a.webp']);
    expect(deps.sign).toHaveBeenCalledWith(expect.objectContaining({ invitationId: ID, kind: 'bgm', contentType: 'audio/mpeg', bytes: 1000 }));
  });

  it('사진은 본 이미지와 400px 작은 사진 두 벌을 같은 형식으로 올린다', async () => {
    const { deps } = fakeDeps();
    await uploadDraftMedia(invitation({ photos: ['file:///a.jpg'] }), deps);
    expect(deps.sign.mock.calls.map((c) => c[0])).toEqual([
      expect.objectContaining({ kind: 'image', contentType: 'image/jpeg' }),
      expect.objectContaining({ kind: 'thumb', contentType: 'image/jpeg', mainKey: 'key1' }),
    ]);
    expect(deps.makeThumb).toHaveBeenCalledWith('file:///a.jpg', 'image/jpeg');
    expect(deps.put).toHaveBeenCalledTimes(2);
  });

  it('다른 기기에서 불러온 초대장은 올릴 파일이 없다', async () => {
    const { deps } = fakeDeps();
    const inv = invitation({ photos: ['r2://invitations/a/b.webp', 'https://media/invitations/a/c.webp'] });
    expect(await uploadDraftMedia(inv, deps)).toEqual(inv);
    expect(deps.sign).not.toHaveBeenCalled();
    expect(deps.put).not.toHaveBeenCalled();
  });

  it('공개 주소 설정이 없으면 파일을 올리기 전에 실패한다', async () => {
    const { deps } = fakeDeps();
    deps.publicUrl = () => {
      throw new Error('no base');
    };
    const inv = invitation({ photos: ['file:///a.webp'] });
    await expect(uploadDraftMedia(inv, deps)).rejects.toBeInstanceOf(MediaUploadError);
    expect(deps.put).not.toHaveBeenCalled();
  });

  it('한 파일이 실패하면 던지고, 다시 부르면 성공한 파일은 다시 올리지 않는다', async () => {
    const { deps, failing } = fakeDeps();
    failing.add('file:///b.webp');
    const inv = invitation({ photos: ['file:///a.webp', 'file:///b.webp', 'file:///c.webp'] });
    await expect(uploadDraftMedia(inv, deps)).rejects.toBeInstanceOf(MediaUploadError);
    const puts = (uri: string) => deps.put.mock.calls.filter((c) => (c[2] as unknown as string) === uri).length;
    const before = puts('file:///a.webp');
    expect(before).toBe(1);

    failing.clear();
    const out = await uploadDraftMedia(inv, deps);
    expect(collectLocalMedia(out)).toEqual([]);
    expect(puts('file:///a.webp')).toBe(1);
    expect(puts('file:///b.webp')).toBe(2);
    expect(puts('file:///c.webp')).toBe(1);
  });

  it('본 이미지만 오르고 작은 사진이 실패하면 다음에 작은 사진만 다시 올린다', async () => {
    const { deps, failing } = fakeDeps();
    failing.add('file:///a.webp.thumb.webp');
    const inv = invitation({ photos: ['file:///a.webp'] });
    await expect(uploadDraftMedia(inv, deps)).rejects.toBeInstanceOf(MediaUploadError);
    failing.clear();
    await uploadDraftMedia(inv, deps);
    expect(deps.sign.mock.calls.filter((c) => c[0].kind === 'image')).toHaveLength(1);
    expect(deps.sign.mock.calls.filter((c) => c[0].kind === 'thumb')).toHaveLength(2);
  });

  it('같은 파일이 두 곳에 쓰이면 한 번만 올린다', async () => {
    const { deps } = fakeDeps();
    const inv = invitation({ photos: ['file:///a.webp', 'file:///a.webp'], photo: 'file:///a.webp' });
    const out = await uploadDraftMedia(inv, deps);
    expect(deps.sign.mock.calls.filter((c) => c[0].kind === 'image')).toHaveLength(1);
    expect(new Set(photosOf(out)).size).toBe(1);
    expect(collectLocalMedia(out)).toEqual([]);
  });

  it('2MB 를 넘거나 모르는 형식의 사진은 줄여서 올린다', async () => {
    const { deps } = fakeDeps({
      read: jest.fn(async (uri: string) => ({ body: uri as unknown as Blob, type: '', bytes: uri.includes('small') ? 1000 : 3 * MB })),
    });
    await uploadDraftMedia(invitation({ photos: ['file:///big.heic'] }), deps);
    expect(deps.recompress).toHaveBeenCalledWith('file:///big.heic');
    expect(deps.sign.mock.calls[0][0]).toMatchObject({ kind: 'image', contentType: 'image/webp', bytes: 1000 });
  });

  it('사진 앱 주소(ph:)는 변환한 파일을 읽어 올린다', async () => {
    const { deps } = fakeDeps();
    await uploadDraftMedia(invitation({ photos: ['ph://abc'] }), deps);
    expect(deps.recompress).toHaveBeenCalledWith('ph://abc');
    expect(deps.read).not.toHaveBeenCalledWith('ph://abc');
    expect(deps.sign.mock.calls[0][0]).toMatchObject({ kind: 'image', contentType: 'image/webp' });
  });

  it('주소에 확장자가 없고 형식도 모르는 BGM·영상도 막히지 않는다', async () => {
    const { deps } = fakeDeps();
    const inv = invitation({ bgm: 'content://a/1' });
    await uploadDraftMedia({ ...inv, content: { ...inv.content, bgm: { uri: 'content://a/1', fileName: null, muteColor: 'white' } } as Invitation['content'] }, deps);
    expect(deps.sign.mock.calls[0][0]).toMatchObject({ kind: 'bgm', contentType: 'audio/mpeg' });
  });

  it('상한을 넘는 파일은 서명을 받기 전에 던진다', async () => {
    const { deps } = fakeDeps({ read: jest.fn(async (uri: string) => ({ body: uri as unknown as Blob, type: 'audio/mpeg', bytes: 6 * MB })) });
    await expect(uploadDraftMedia(invitation({ bgm: 'file:///s.mp3' }), deps)).rejects.toBeInstanceOf(MediaUploadError);
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it('서명이나 올리기가 멈추면 시간 제한으로 끝나 다시 시도할 수 있다', async () => {
    jest.useFakeTimers();
    try {
      const a = fakeDeps({ sign: jest.fn(() => new Promise<never>(() => {})) });
      const caught = expect(uploadDraftMedia(invitation({ photos: ['file:///a.webp'] }), a.deps)).rejects.toBeInstanceOf(MediaUploadError);
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
      await caught;

      let signal: AbortSignal | undefined;
      const b = fakeDeps({
        put: jest.fn((_u: string, _h: Record<string, string>, _b: Blob, s: AbortSignal) => {
          signal = s;
          return new Promise<void>(() => {});
        }),
      });
      const caught2 = expect(uploadDraftMedia(invitation({ photos: ['file:///a.webp'] }), b.deps)).rejects.toBeInstanceOf(MediaUploadError);
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
      await caught2;
      expect(signal?.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('진행 상황을 파일 단위로 알린다', async () => {
    const { deps } = fakeDeps();
    const seen: string[] = [];
    await uploadDraftMedia(invitation({ photos: ['file:///a.webp', 'file:///b.webp'] }), {
      ...deps,
      onProgress: (d, t) => seen.push(`${d}/${t}`),
    });
    expect(seen[0]).toBe('0/2');
    expect(seen[seen.length - 1]).toBe('2/2');
  });

  it('서버 id 가 아니면 파일을 올리지 않고 던진다', async () => {
    const { deps } = fakeDeps();
    await expect(uploadDraftMedia(invitation({ id: 'inv-local', photos: ['file:///a.webp'] }), deps)).rejects.toBeInstanceOf(MediaUploadError);
    expect(deps.sign).not.toHaveBeenCalled();
  });
});

describe('saveWithMedia', () => {
  const server = (inv: Invitation) => ({ ...inv, id: inv.id.startsWith('inv-') ? ID : inv.id, number: '12345678901' });

  it('새 초대장: 기기 주소를 뺀 사본을 작성 중으로 먼저 저장해 id 를 받고, 올린 뒤 전체를 같은 id 로 저장한다', async () => {
    const save = jest.fn(async (i: Invitation) => server(i));
    const upload = jest.fn(async (i: Invitation) => ({ ...i, name: '올림' }));
    const onId = jest.fn();
    const inv = { ...invitation({ id: 'inv-local', photos: ['file:///a.webp'] }), status: 'final' as const };
    const out = await saveWithMedia(inv, { save, upload, onId });
    expect(save).toHaveBeenCalledTimes(2);
    expect(collectLocalMedia(save.mock.calls[0][0])).toEqual([]);
    expect(save.mock.calls[0][0].status).toBe('draft');
    expect(onId).toHaveBeenCalledWith(ID);
    expect(upload.mock.calls[0][0]).toMatchObject({ id: ID, status: 'final' });
    expect(save.mock.calls[1][0]).toMatchObject({ id: ID, name: '올림', status: 'final' });
    expect(out.number).toBe('12345678901');
  });

  it('올리기가 실패하면 id 는 남기고 던지며, 다시 저장하면 새 행을 만들지 않는다', async () => {
    const save = jest.fn(async (i: Invitation) => server(i));
    const upload = jest.fn(async (i: Invitation): Promise<Invitation> => i);
    upload.mockRejectedValueOnce(new MediaUploadError(new Error('끊김')));
    let id = 'inv-local';
    const onId = (v: string) => {
      id = v;
    };
    const first = invitation({ id, photos: ['file:///a.webp'] });
    await expect(saveWithMedia(first, { save, upload, onId })).rejects.toBeInstanceOf(MediaUploadError);
    expect(id).toBe(ID);
    expect(save).toHaveBeenCalledTimes(1);

    await saveWithMedia({ ...first, id }, { save, upload, onId });
    // 처음 사본 저장 1 + 다시 시도의 전체 저장 1. 새로 만드는 저장(inv- id)은 처음 한 번뿐이다
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].id).toBe(ID);
  });

  it('올릴 파일이 없으면 저장 한 번으로 끝난다', async () => {
    const save = jest.fn(async (i: Invitation) => server(i));
    const upload = jest.fn(async (i: Invitation) => i);
    await saveWithMedia(invitation({ id: 'inv-local' }), { save, upload, onId: jest.fn() });
    expect(save).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
  });

  it('mock 모드(올리기 없음)에서는 그대로 저장한다', async () => {
    const save = jest.fn(async (i: Invitation) => i);
    const inv = invitation({ id: 'inv-local', photos: ['file:///a.webp'] });
    await saveWithMedia(inv, { save, upload: null, onId: jest.fn() });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(inv);
  });
});
