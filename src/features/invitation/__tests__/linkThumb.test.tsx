import type { ReactElement } from 'react';

import { mapInvitationMedia } from '../../../services/media/localMedia';
import { press, render } from '../../../test/ui';
import { CorporateBasicForm } from '../editor/CorporateForms';
import { DolBasicForm } from '../editor/DolForms';
import { LinkThumbField } from '../editor/LinkThumbField';
import { MeetupBasicForm } from '../editor/MeetupForms';
import { BasicForm } from '../editor/TextForms';
import { useEditor } from '../editorStore';
import { linkThumbFallback, pickLinkThumb, prepareLinkThumb, userLinkThumb } from '../linkThumb';
import { LINK_THUMB_HEIGHT, LINK_THUMB_WIDTH } from '../media';
import type { Invitation } from '../model';
import { createInvitation, validateFor } from '../themes';

const mockCrop = jest.fn();
const mockResize = jest.fn();
const mockSave = jest.fn();
const mockManipulate = jest.fn();
const mockPick = jest.fn();
let mockSize = { width: 4000, height: 3000 };

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: (source: unknown) => {
      mockManipulate(source);
      return {
        crop: mockCrop,
        resize: mockResize,
        renderAsync: async () => ({ ...mockSize, saveAsync: mockSave }),
      };
    },
  },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args) }));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));

const HINT = '권장 800×400px (가로:세로 2:1), JPG·PNG';
const COVER = 'file:///cover.webp';
const GREETING = 'file:///greeting.webp';
const GALLERY = 'file:///g1.webp';
const REMOTE = 'https://media.example/invitations/a/p.webp';

let made = 0;
beforeEach(() => {
  jest.clearAllMocks();
  mockSize = { width: 4000, height: 3000 };
  mockSave.mockImplementation(async () => {
    made += 1;
    return { uri: `file:///made-${made}.jpg` };
  });
});

/** 테마별 초안에 사진을 넣는다 */
function inv(
  themeId: 'wedding' | 'dol' | 'corporate' | 'meetup',
  photos: { cover?: string | null; greeting?: string | null; gallery?: string[] } = {},
  extra: Partial<Invitation> = {},
): Invitation {
  const base = createInvitation({ id: 'a', ownerId: 'u', themeId, templateId: `${themeId}-1`, today: new Date(2026, 9, 26) });
  const c = base.content as never as Record<string, Record<string, unknown>>;
  const content = { ...c, greeting: { ...c.greeting, photo: photos.greeting ?? null } } as Record<string, unknown>;
  if (themeId === 'dol' || themeId === 'meetup') content.basic = { ...c.basic, photo: photos.cover ?? null };
  if (themeId !== 'corporate') content.gallery = { ...c.gallery, photos: photos.gallery ?? [] };
  return { ...base, content: content as never, ...extra };
}

/** 대표 사진만 바꾼 사본 */
function withCover(source: Invitation, photo: string | null): Invitation {
  const c = source.content as never as { basic: object };
  return { ...source, content: { ...source.content, basic: { ...c.basic, photo } } as Invitation['content'] };
}

describe('linkThumbFallback', () => {
  it('linkThumbFallback 은 테마별로 정한 순서를 따른다', () => {
    const all = { cover: COVER, greeting: GREETING, gallery: [GALLERY] };
    // 돌잔치·모임: 대표 사진 → 인사말 → 갤러리
    expect(linkThumbFallback(inv('dol', all))).toBe(COVER);
    expect(linkThumbFallback(inv('meetup', all))).toBe(COVER);
    expect(linkThumbFallback(inv('meetup', { greeting: GREETING, gallery: [GALLERY] }))).toBe(GREETING);
    expect(linkThumbFallback(inv('dol', { gallery: [GALLERY] }))).toBe(GALLERY);
    // 결혼식은 대표 사진이 없다
    expect(linkThumbFallback(inv('wedding', { greeting: GREETING, gallery: [GALLERY] }))).toBe(GREETING);
    expect(linkThumbFallback(inv('wedding', { gallery: [GALLERY] }))).toBe(GALLERY);
    // 기업은 대표 사진도 갤러리도 없고, 로고는 쓰지 않는다
    expect(linkThumbFallback(inv('corporate', { greeting: GREETING }))).toBe(GREETING);
  });

  it('사진이 없으면 null', () => {
    expect(linkThumbFallback(inv('wedding'))).toBeNull();
    expect(linkThumbFallback(inv('dol'))).toBeNull();
    expect(linkThumbFallback(inv('corporate'))).toBeNull();
    expect(linkThumbFallback(inv('meetup'))).toBeNull();
  });

  it('갤러리를 끈 초대장의 사진은 하객에게 안 보이므로 쓰지 않는다', () => {
    const off = inv('wedding', { gallery: [GALLERY] });
    expect(linkThumbFallback({ ...off, enabled: { ...off.enabled, gallery: false } })).toBeNull();
  });
});

describe('prepareLinkThumb', () => {
  it('직접 올린 썸네일이 있으면 대체하지 않는다', async () => {
    const mine = inv('meetup', { cover: COVER }, { linkThumb: 'file:///mine.jpg' });
    expect(await prepareLinkThumb(mine)).toBe(mine);
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('직접 올린 썸네일은 서버 주소가 되어도, 사진을 바꿔도 그대로다', async () => {
    const mine = inv('meetup', { cover: 'file:///new.webp' }, { linkThumb: 'https://media.example/mine.jpg' });
    expect(await prepareLinkThumb(mine)).toBe(mine);
  });

  it('대체 이미지는 사진과 다른 800×400 JPEG 파일이고, 어느 사진에서 만들었는지 남긴다', async () => {
    const out = await prepareLinkThumb(inv('meetup', { cover: COVER }));
    expect(out.linkThumb).toMatch(/^file:\/\/\/made-/);
    expect(out.linkThumb).not.toBe(COVER);
    expect(out.content.linkThumbSource).toBe(COVER);
    expect(userLinkThumb(out)).toBeNull();
    // 4:3 가운데를 2:1 로 자른다
    expect(mockCrop).toHaveBeenCalledWith({ originX: 0, originY: 500, width: 4000, height: 2000 });
    expect(mockResize).toHaveBeenCalledWith({ width: LINK_THUMB_WIDTH, height: LINK_THUMB_HEIGHT });
    expect(LINK_THUMB_WIDTH).toBe(800);
    expect(LINK_THUMB_HEIGHT).toBe(400);
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' }));
  });

  it('세로 사진도 가운데를 자른다', async () => {
    mockSize = { width: 1000, height: 3000 };
    await prepareLinkThumb(inv('meetup', { cover: 'file:///tall.webp' }));
    expect(mockCrop).toHaveBeenCalledWith({ originX: 0, originY: 1250, width: 1000, height: 500 });
  });

  it('바뀐 게 없으면 새 파일을 만들지 않는다 (올린 뒤 주소가 바뀌어도)', async () => {
    const out = await prepareLinkThumb(inv('meetup', { cover: 'file:///same.webp' }));
    // 올리기: 사진·썸네일·표시가 함께 공개 주소로 바뀐다
    const uploaded = mapInvitationMedia(out, (uri) => uri.replace('file:///', 'https://media.example/'));
    expect(uploaded.content.linkThumbSource).toBe('https://media.example/same.webp');
    mockManipulate.mockClear();
    expect(await prepareLinkThumb(uploaded)).toBe(uploaded);
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('올리기가 실패해 다시 저장해도 같은 사진이면 같은 파일을 쓴다', async () => {
    const draft = inv('meetup', { cover: 'file:///retry.webp' });
    const first = await prepareLinkThumb(draft);
    const again = await prepareLinkThumb({ ...draft, id: '11111111-2222-4333-8444-555555555555' });
    expect(again.linkThumb).toBe(first.linkThumb);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('원본 사진을 바꾸면 대체 이미지를 다시 만든다', async () => {
    const out = await prepareLinkThumb(inv('meetup', { cover: COVER }));
    const next = await prepareLinkThumb(withCover(out, 'file:///other.webp'));
    expect(next.linkThumb).not.toBe(out.linkThumb);
    expect(next.content.linkThumbSource).toBe('file:///other.webp');
  });

  it('사진이 모두 없어지면 남은 대체 이미지를 지운다', async () => {
    const out = await prepareLinkThumb(inv('meetup', { cover: COVER }));
    const next = await prepareLinkThumb(withCover(out, null));
    expect(next.linkThumb).toBeNull();
    expect(next.content.linkThumbSource).toBeUndefined();
  });

  it('사진도 썸네일도 없으면 그대로다', async () => {
    const none = inv('wedding');
    expect(await prepareLinkThumb(none)).toBe(none);
  });

  it('이미지를 만들지 못해도 던지지 않고 썸네일 없이 저장하게 한다', async () => {
    mockSave.mockRejectedValueOnce(new Error('깨진 파일'));
    const out = await prepareLinkThumb(inv('meetup', { cover: 'file:///broken.webp' }));
    expect(out.linkThumb ?? null).toBeNull();
    expect(out.content.linkThumbSource).toBeUndefined();
  });

  it('원본이 서버 주소면 내려받지 않고 건너뛴다', async () => {
    const out = await prepareLinkThumb(inv('wedding', { gallery: [REMOTE] }));
    expect(out.linkThumb ?? null).toBeNull();
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('원본이 다른 서버 주소로 바뀌었는데 만들 수 없으면 옛 사진의 대체 이미지를 남기지 않는다', async () => {
    const old = inv('wedding', { gallery: [REMOTE] }, { linkThumb: 'https://media.example/old-thumb.jpg' });
    const stale = { ...old, content: { ...old.content, linkThumbSource: 'https://media.example/old.webp' } };
    const out = await prepareLinkThumb(stale);
    expect(out.linkThumb).toBeNull();
    expect(out.content.linkThumbSource).toBeUndefined();
  });
});

describe('pickLinkThumb', () => {
  it('고른 이미지를 가운데 기준 2:1 로 잘라 800×400 JPEG 로 만든다', async () => {
    mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///p.png', mimeType: 'image/png' }] });
    expect(await pickLinkThumb()).toMatch(/^file:\/\/\/made-/);
    expect(mockCrop).toHaveBeenCalledWith({ originX: 0, originY: 500, width: 4000, height: 2000 });
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' }));
  });

  it('취소하거나 허용되지 않은 형식이면 null', async () => {
    mockPick.mockResolvedValueOnce({ canceled: true, assets: [] });
    expect(await pickLinkThumb()).toBeNull();
    mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///p.gif', mimeType: 'image/gif' }] });
    expect(await pickLinkThumb()).toBeNull();
  });

  it('변환하지 못하면 null', async () => {
    mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///p.png', mimeType: 'image/png' }] });
    mockSave.mockRejectedValueOnce(new Error('깨진 파일'));
    expect(await pickLinkThumb()).toBeNull();
  });
});

describe('입력 칸', () => {
  const start = (themeId: string) => useEditor.getState().start({ ownerId: 'u', themeId, templateId: `${themeId}-1` });
  // 테마를 바꾸기 전에 내린다. 떠 있는 폼은 다른 테마의 초안을 읽지 못한다
  let shown: ReturnType<typeof render> | null = null;
  const show = (el: ReactElement) => {
    shown?.unmount();
    shown = render(el);
    return shown;
  };
  afterEach(() => {
    shown?.unmount();
    shown = null;
  });

  it('입력 칸 아래에 "권장 800×400px (가로:세로 2:1), JPG·PNG" 문구가 보인다', () => {
    start('wedding');
    expect(show(<LinkThumbField />).getText(HINT)).toBeTruthy();
  });

  it('네 테마의 기본 정보 폼에 모두 있다', () => {
    start('wedding');
    expect(show(<BasicForm />).getText(HINT)).toBeTruthy();
    start('dol');
    expect(show(<DolBasicForm />).getText(HINT)).toBeTruthy();
    start('corporate');
    expect(show(<CorporateBasicForm />).getText(HINT)).toBeTruthy();
    start('meetup');
    expect(show(<MeetupBasicForm />).getText(HINT)).toBeTruthy();
  });

  it('지우기를 누르면 null', () => {
    start('wedding');
    useEditor.getState().setLinkThumb('file:///mine.jpg');
    const ui = show(<LinkThumbField />);
    press(ui.getText('지우기'));
    expect(useEditor.getState().draft!.linkThumb).toBeNull();
    expect(useEditor.getState().dirty).toBe(true);
  });

  it('고르면 직접 올린 값이 되어 대체 이미지 표시가 풀린다', async () => {
    start('meetup');
    useEditor.getState().patch('basic', { photo: COVER });
    useEditor.getState().markSaved(await prepareLinkThumb(useEditor.getState().draft!));
    useEditor.getState().setLinkThumb('file:///mine.jpg');
    const d = useEditor.getState().draft!;
    expect(d.content.linkThumbSource).toBeUndefined();
    expect(userLinkThumb(d)).toBe('file:///mine.jpg');
  });

  it('대체 이미지는 직접 올린 값처럼 보이지 않는다', async () => {
    start('meetup');
    useEditor.getState().patch('basic', { photo: COVER });
    useEditor.getState().markSaved(await prepareLinkThumb(useEditor.getState().draft!));
    expect(show(<LinkThumbField />).queryText('지우기')).toBeNull();
  });

  it('선택 항목이라 비어 있어도 빨간 점이 생기지 않는다', () => {
    start('wedding');
    const d = useEditor.getState().draft!;
    const before = validateFor(d, 'basic');
    expect(validateFor({ ...d, linkThumb: 'file:///mine.jpg' } as Invitation, 'basic')).toEqual(before);
    expect(before).not.toContain('linkThumb');
  });
});
