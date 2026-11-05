import type { Invitation } from '../../features/invitation/model';
import { createInvitation } from '../../features/invitation/themes';
import { collectLocalMedia, mapInvitationMedia, stripLocalMedia } from '../media/localMedia';
import { fromMediaRef, thumbUrlOf, toMediaRef } from '../media/mediaRef';

const base = (themeId: string, content: object, patch: Partial<Invitation> = {}): Invitation => {
  const inv = createInvitation({ id: 'inv-1', ownerId: 'u', themeId, templateId: `${themeId}-1` });
  return { ...inv, content: { ...inv.content, ...content } as Invitation['content'], ...patch };
};

const el = { x: 0, y: 0, w: 1, rotation: 0, aspect: 1 };
const canvas = {
  cover: {
    mode: 'canvas',
    canvas: {
      background: { kind: 'image', uri: 'file:///bg.webp' },
      elements: [
        { ...el, id: 'a', kind: 'image', uri: 'file:///el.webp', shape: 'rect' },
        { ...el, id: 'b', kind: 'gif', uri: 'blob:http://x/gif' },
        { ...el, id: 'c', kind: 'video', uri: 'content://v/1', durationMs: 1 },
        { ...el, id: 'd', kind: 'text', text: 'file:///글자는-주소가-아니다' },
      ],
    },
  },
} as unknown as Invitation['design'];

const kinds = (inv: Invitation) =>
  collectLocalMedia(inv)
    .map((m) => `${m.kind} ${m.uri}`)
    .sort();

describe('collectLocalMedia', () => {
  it('collectLocalMedia 는 캔버스 사진·GIF·동영상·BGM·갤러리·링크 썸네일을 모두 찾는다', () => {
    const w = createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }).content as never as {
      ceremony: object;
      greeting: object;
      gallery: object;
      ending: object;
    };
    const inv = base(
      'wedding',
      {
        ceremony: { ...w.ceremony, mapImages: ['file:///map.webp'] },
        greeting: { ...w.greeting, photo: 'data:image/jpeg;base64,AAA' },
        gallery: { ...w.gallery, photos: ['file:///g1.webp', 'ph://g2'] },
        ending: { ...w.ending, photos: ['file:///end.webp'] },
        bgm: { uri: 'file:///song.mp3', fileName: '노래.mp3', muteColor: 'white' },
      },
      { design: canvas, linkThumb: 'file:///link.jpg' },
    );
    expect(kinds(inv)).toEqual(
      [
        'image file:///map.webp',
        'image data:image/jpeg;base64,AAA',
        'image file:///g1.webp',
        'image ph://g2',
        'image file:///end.webp',
        'bgm file:///song.mp3',
        'image file:///bg.webp',
        'image file:///el.webp',
        'gif blob:http://x/gif',
        'video content://v/1',
        'linkThumb file:///link.jpg',
      ].sort(),
    );
    expect(collectLocalMedia(inv).find((m) => m.kind === 'bgm')?.fileName).toBe('노래.mp3');
  });

  it('대체 썸네일의 원본 표시는 사진과 같이 바뀌고 지워지며, 파일은 사진 종류로 센다', () => {
    const w = createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }).content as never as { greeting: object };
    const inv = base('wedding', {
      greeting: { ...w.greeting, photo: 'file:///g.webp' },
      linkThumbSource: 'file:///g.webp',
    });
    expect(collectLocalMedia(inv).map((m) => m.kind)).toEqual(['image', 'image']);
    expect(stripLocalMedia(inv).content.linkThumbSource).toBeNull();
    const mapped = mapInvitationMedia(inv, (u) => u.replace('file:///', 'https://m/'));
    expect(mapped.content.linkThumbSource).toBe('https://m/g.webp');
  });

  it('돌잔치의 표지·프로필·타임라인 사진을 찾는다', () => {
    const inv = base('dol', {
      basic: { childName: '', nickname: '', birthDate: '', photo: 'file:///cover.webp', guardians: [] },
      profile: { photo: 'file:///profile.webp', intro: '', hashtags: [] },
      timeline: { items: [{ id: 't', photo: 'file:///t.webp', date: '', title: '', text: '', edited: false }] },
    });
    expect(kinds(inv)).toEqual(['image file:///cover.webp', 'image file:///profile.webp', 'image file:///t.webp'].sort());
  });

  it('기업 행사의 로고·연사 사진을 찾는다', () => {
    const inv = base('corporate', {
      basic: { eventName: '', host: '', logo: 'file:///logo.png', inviterTitle: '', inviterName: '' },
      speakers: { items: [{ id: 's', photo: 'file:///s.webp', name: '', title: '', line: '' }] },
    });
    expect(kinds(inv)).toEqual(['image file:///logo.png', 'image file:///s.webp'].sort());
  });

  it('모임의 대표 사진과 BGM 을 찾는다', () => {
    const inv = base('meetup', {
      basic: { eventName: '', host: '', photo: 'file:///m.webp' },
      bgm: { uri: 'content://a/1', fileName: 'a.m4a', muteColor: 'white' },
    });
    expect(kinds(inv)).toEqual(['bgm content://a/1', 'image file:///m.webp']);
  });

  it('이미 r2 주소인 값은 찾지 않는다', () => {
    const inv = base(
      'meetup',
      {
        basic: { eventName: 'data: 글자', host: 'file: 글자', photo: 'r2://invitations/a/b.webp' },
        bgm: { uri: 'https://media.example/invitations/a/c.mp3', fileName: 'c.mp3', muteColor: 'white' },
      },
      { linkThumb: 'https://media.example/invitations/a/d.jpg' },
    );
    expect(collectLocalMedia(inv)).toEqual([]);
  });
});

describe('stripLocalMedia', () => {
  it('서버에 처음 저장할 사본에는 기기 주소가 하나도 없고, 서버 주소와 글자는 남는다', () => {
    const inv = base(
      'meetup',
      {
        basic: { eventName: '모임', host: '', photo: 'file:///m.webp' },
        gallery: { style: 'swipe', columns: 3, collapse: true, photos: ['file:///a.webp', 'https://m/b.webp'] },
        bgm: { uri: 'file:///a.mp3', fileName: 'a.mp3', muteColor: 'white' },
      },
      {
        design: {
          cover: {
            mode: 'canvas',
            canvas: {
              background: { kind: 'image', uri: 'file:///bg.webp' },
              elements: [
                { ...el, id: 'a', kind: 'image', uri: 'file:///el.webp', shape: 'rect' },
                { ...el, id: 'd', kind: 'sticker', icon: 'heart' },
              ],
            },
          },
        },
        linkThumb: 'file:///l.jpg',
      },
    );
    const s = stripLocalMedia(inv);
    expect(collectLocalMedia(s)).toEqual([]);
    expect(JSON.stringify(s)).not.toMatch(/"(file|content|blob|ph):|"data:image/);
    expect((s.content as { gallery: { photos: string[] } }).gallery.photos).toEqual(['https://m/b.webp']);
    expect((s.content as { basic: { eventName: string; photo: null } }).basic).toMatchObject({ eventName: '모임', photo: null });
    expect(s.linkThumb).toBeNull();
    const doc = (s.design.cover as { canvas: { background: unknown; elements: { id: string }[] } }).canvas;
    expect(doc.background).toEqual({ kind: 'template' });
    expect(doc.elements.map((e) => e.id)).toEqual(['d']);
    // 원본은 그대로
    expect(collectLocalMedia(inv).length).toBeGreaterThan(0);
  });
});

describe('주소 변환', () => {
  const saved = process.env.EXPO_PUBLIC_MEDIA_BASE_URL;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = 'https://media.example/';
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = saved;
  });

  it('공개 주소와 서버 값을 서로 바꾼다. 도메인이 바뀌어도 키는 그대로다', () => {
    expect(toMediaRef('https://media.example/invitations/a/b.webp')).toBe('r2://invitations/a/b.webp');
    expect(fromMediaRef('r2://invitations/a/b.webp')).toBe('https://media.example/invitations/a/b.webp');
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = 'https://cdn.wuzu.kr';
    expect(fromMediaRef('r2://invitations/a/b.webp')).toBe('https://cdn.wuzu.kr/invitations/a/b.webp');
  });

  it('우리 저장소 주소가 아니면 건드리지 않는다', () => {
    expect(toMediaRef('https://other.example/a.png')).toBe('https://other.example/a.png');
    expect(fromMediaRef('https://other.example/a.png')).toBe('https://other.example/a.png');
  });

  it('주소 환경 변수가 없으면 r2 값을 그대로 둔다 (빈 주소로 깨지지 않게)', () => {
    process.env.EXPO_PUBLIC_MEDIA_BASE_URL = '';
    expect(fromMediaRef('r2://a/b.webp')).toBe('r2://a/b.webp');
  });

  it('작은 사진 주소는 본 이미지 주소에서 만든다', () => {
    expect(thumbUrlOf('https://media.example/invitations/a/b.webp')).toBe('https://media.example/invitations/a/b_thumb.webp');
  });

  it('mapInvitationMedia 는 파일 칸만 바꾸고 글자는 건드리지 않는다', () => {
    const inv = base('meetup', { basic: { eventName: 'r2://글자', host: '', photo: 'r2://k.webp' } }, { linkThumb: 'r2://t.jpg' });
    const out = mapInvitationMedia(inv, fromMediaRef);
    expect((out.content as { basic: { eventName: string; photo: string } }).basic).toMatchObject({
      eventName: 'r2://글자',
      photo: 'https://media.example/k.webp',
    });
    expect(out.linkThumb).toBe('https://media.example/t.jpg');
  });
});
