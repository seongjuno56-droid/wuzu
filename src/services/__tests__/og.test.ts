import { buildGuestPage, GuestPageDeps, isGuestSlug, OgMeta, renderOg } from '../../../api/_lib/og';

const SHELL = '<!DOCTYPE html><html><head><title>wuzu</title><script src="/_expo/app.js" defer></script></head><body><div id="root"></div></body></html>';
const SLUG = 'abcDEF123456';
const ENV = {
  supabaseUrl: 'https://db.example.co',
  supabaseKey: 'sb_publishable_test',
  mediaBaseUrl: 'https://media.example.dev',
  siteUrl: 'https://guest.example.app',
};
const META: OgMeta = {
  title: '우리 결혼합니다',
  description: '소중한 날에 초대합니다',
  image: 'https://media.example.dev/u/1/thumb.jpg',
  url: `https://guest.example.app/i/${SLUG}`,
};

/** head 안의 meta 태그 값 */
function metaOf(html: string, key: string): string | undefined {
  const m = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html);
  return m?.[1];
}

const active = (patch: Record<string, unknown> = {}) => ({
  state: 'active',
  invitation: {
    name: '우리 결혼합니다',
    linkThumb: 'r2://u/1/thumb.jpg',
    content: { greeting: { content: '소중한 날에\n초대합니다' } },
    ...patch,
  },
});

function deps(answer: unknown, patch: Partial<GuestPageDeps> = {}): GuestPageDeps & { fetch: jest.Mock } {
  const fetch = jest.fn(async () => ({ ok: true, json: async () => answer }) as Response);
  return { shell: SHELL, env: ENV, fetch, timeoutMs: 50, ...patch } as GuestPageDeps & { fetch: jest.Mock };
}

describe('renderOg', () => {
  it('제목의 <script>·따옴표·&·줄바꿈을 이스케이프한다', () => {
    const html = renderOg(SHELL, { ...META, title: `<script>alert("x")</script> & 'q'\n둘째 줄` });
    expect(html).not.toContain('<script>alert');
    const title = metaOf(html, 'og:title');
    expect(title).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39; 둘째 줄');
    expect(html).toContain(`<title>${title}</title>`);
  });

  it('기존 head 뒤에 og:title·og:description·og:image·og:url·twitter:card 를 넣는다', () => {
    const html = renderOg(SHELL, META);
    expect(metaOf(html, 'og:title')).toBe(META.title);
    expect(metaOf(html, 'og:description')).toBe(META.description);
    expect(metaOf(html, 'og:image')).toBe(META.image);
    expect(metaOf(html, 'og:url')).toBe(META.url);
    expect(metaOf(html, 'twitter:card')).toBe('summary_large_image');
    // 기존 head 내용 뒤, </head> 앞이다
    expect(html.indexOf('/_expo/app.js')).toBeLessThan(html.indexOf('og:title'));
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
  });

  it('값의 $& 같은 글자를 치환 문법으로 해석하지 않는다', () => {
    const html = renderOg(SHELL, { ...META, title: "$& $` $' 값" });
    expect(metaOf(html, 'og:title')).toBe('$&amp; $` $&#39; 값');
    expect(html.match(/<\/head>/g)).toHaveLength(1);
  });
});

describe('isGuestSlug', () => {
  it('서버가 만드는 모양만 받는다', () => {
    expect(isGuestSlug(SLUG)).toBe(true);
    for (const bad of ['', 'short', 'a'.repeat(65), '../../etc/passwd', 'abc def 12345', 'abcDEF123456/x', 'abcDEF123456"><', 'abcDEF123456\n', '한글주소한글주소한글주소']) {
      expect(isGuestSlug(bad)).toBe(false);
    }
  });
});

describe('buildGuestPage', () => {
  it('공개 RPC 하나만 publishable 키로 부른다', async () => {
    const d = deps(active());
    await buildGuestPage([SLUG], d);
    expect(d.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = d.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://db.example.co/rest/v1/rpc/guest_invitation');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ p_slug: SLUG }));
    expect(init.headers).toMatchObject({ apikey: ENV.supabaseKey });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('활성 초대장이면 이름·인사말·썸네일 공개 주소를 넣고 짧게 캐시한다', async () => {
    const page = await buildGuestPage([SLUG], deps(active()));
    expect(page.status).toBe(200);
    expect(metaOf(page.body, 'og:title')).toBe('우리 결혼합니다');
    expect(metaOf(page.body, 'og:description')).toBe('소중한 날에 초대합니다');
    expect(metaOf(page.body, 'og:image')).toBe('https://media.example.dev/u/1/thumb.jpg');
    expect(metaOf(page.body, 'og:url')).toBe(`https://guest.example.app/i/${SLUG}`);
    expect(page.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=60');
    expect(page.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  it('설명은 줄바꿈을 접고 짧게 자르며, 없으면 기본 문구다', async () => {
    const long = await buildGuestPage([SLUG], deps(active({ content: { greeting: { content: '가'.repeat(300) } } })));
    expect(metaOf(long.body, 'og:description')).toBe(`${'가'.repeat(80)}…`);
    const empty = await buildGuestPage([SLUG], deps(active({ content: {} })));
    expect(metaOf(empty.body, 'og:description')).toBe('모바일 초대장이 도착했어요');
    const wrong = await buildGuestPage([SLUG], deps(active({ content: { greeting: { content: 42 } } })));
    expect(metaOf(wrong.body, 'og:description')).toBe('모바일 초대장이 도착했어요');
  });

  it('이미지가 없으면 기본 이미지', async () => {
    const page = await buildGuestPage([SLUG], deps(active({ linkThumb: null })));
    expect(metaOf(page.body, 'og:title')).toBe('우리 결혼합니다');
    expect(metaOf(page.body, 'og:image')).toBe('https://guest.example.app/link-default.jpg');
  });

  it('r2:// 가 아니거나 키 모양이 이상한 이미지는 기본 이미지', async () => {
    for (const linkThumb of ['https://evil.example/x.jpg', 'javascript:alert(1)', 'r2://../secret.jpg', 'r2://a b.jpg', 'r2://', 'r2://a"><script>.jpg', 42]) {
      const page = await buildGuestPage([SLUG], deps(active({ linkThumb })));
      expect(metaOf(page.body, 'og:image')).toBe('https://guest.example.app/link-default.jpg');
    }
  });

  it('공개 주소 환경 변수가 없으면 r2 값도 기본 이미지', async () => {
    const page = await buildGuestPage([SLUG], deps(active(), { env: { ...ENV, mediaBaseUrl: '' } }));
    expect(metaOf(page.body, 'og:image')).toBe('https://guest.example.app/link-default.jpg');
  });

  describe('표지 사진 미리 받기', () => {
    const PRELOAD = /<link rel="preload" as="image" href="([^"]*)"/;
    const canvas = (uri: string) => ({ design: { cover: { mode: 'canvas', canvas: { background: { kind: 'image', uri } } } } });

    it('캔버스 표지의 배경 사진을 미리 받는다', async () => {
      const page = await buildGuestPage([SLUG], deps(active(canvas('r2://u/1/cover.jpg'))));
      expect(PRELOAD.exec(page.body)?.[1]).toBe('https://media.example.dev/u/1/cover.jpg');
    });

    it('돌잔치·모임 형식 표지의 사진을 미리 받는다', async () => {
      const page = await buildGuestPage([SLUG], deps(active({ themeId: 'dol', content: { basic: { photo: 'r2://u/1/baby.jpg' } } })));
      expect(PRELOAD.exec(page.body)?.[1]).toBe('https://media.example.dev/u/1/baby.jpg');
    });

    it('표지 사진이 없거나 r2 값이 아니면 넣지 않는다', async () => {
      for (const patch of [{}, { themeId: 'wedding', content: { basic: { photo: 'r2://u/1/x.jpg' } } }, canvas('https://evil.example/x.jpg'), canvas('r2://../x.jpg')]) {
        const page = await buildGuestPage([SLUG], deps(active(patch)));
        expect(page.body).not.toMatch(PRELOAD);
      }
    });

    it('만료·장애에는 넣지 않는다', async () => {
      const page = await buildGuestPage([SLUG], deps({ state: 'expired', invitation: active(canvas('r2://u/1/cover.jpg')).invitation }));
      expect(page.body).not.toMatch(PRELOAD);
    });
  });

  it('linkThumbSource 는 쓰지 않는다', async () => {
    const page = await buildGuestPage(
      [SLUG],
      deps(active({ linkThumb: null, content: { linkThumbSource: 'r2://u/1/original.jpg', greeting: { content: '안녕' } } })),
    );
    expect(page.body).not.toContain('original.jpg');
  });

  it('없는 초대장·활성화 전·숨김은 초대장 정보를 넣지 않는 기본 태그', async () => {
    const page = await buildGuestPage([SLUG], deps({ state: 'not_found' }));
    expect(page.status).toBe(200);
    expect(metaOf(page.body, 'og:title')).toBe('wuzu 모바일 초대장');
    expect(metaOf(page.body, 'og:image')).toBe('https://guest.example.app/link-default.jpg');
  });

  it('만료도 내용을 넣지 않는다', async () => {
    // 서버가 실수로 초대장을 실어 보내도 active 가 아니면 읽지 않는다
    const page = await buildGuestPage([SLUG], deps({ state: 'expired', invitation: active().invitation }));
    expect(metaOf(page.body, 'og:title')).toBe('wuzu 모바일 초대장');
    expect(page.body).not.toContain('우리 결혼합니다');
    expect(page.body).not.toContain('thumb.jpg');
    expect(page.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=60');
  });

  describe('Supabase 호출이 실패해도 기본 태그로 정적 화면을 돌려준다', () => {
    const expectDefault = (page: Awaited<ReturnType<typeof buildGuestPage>>) => {
      expect(page.status).toBe(200);
      expect(page.body).toContain('/_expo/app.js');
      expect(metaOf(page.body, 'og:title')).toBe('wuzu 모바일 초대장');
      // 장애 결과가 캐시에 남아 복구 뒤에도 기본 태그가 나가지 않게
      expect(page.headers['Cache-Control']).toBe('no-store');
    };

    it('네트워크 오류', async () => {
      const fetch = jest.fn(async () => {
        throw new Error('network');
      });
      expectDefault(await buildGuestPage([SLUG], deps(null, { fetch })));
    });

    it('서버 오류 응답', async () => {
      const fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
      expectDefault(await buildGuestPage([SLUG], deps(null, { fetch })));
    });

    it('JSON 이 아닌 응답', async () => {
      const fetch = jest.fn(async () => ({ ok: true, json: async () => Promise.reject(new Error('bad')) }) as unknown as Response);
      expectDefault(await buildGuestPage([SLUG], deps(null, { fetch })));
    });

    it('이상한 모양의 응답', async () => {
      for (const answer of [null, 'x', 7, [], { state: 'active' }, { state: 'active', invitation: { name: 3 } }, { state: 'nope' }]) {
        expectDefault(await buildGuestPage([SLUG], deps(answer)));
      }
    });

    it('응답이 멈추면 시간 제한 뒤 요청을 끊는다', async () => {
      let signal: AbortSignal | undefined;
      const fetch = jest.fn((_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>(() => {});
      });
      expectDefault(await buildGuestPage([SLUG], deps(null, { fetch: fetch as unknown as typeof globalThis.fetch })));
      expect(signal?.aborted).toBe(true);
    });

    it('환경 변수가 없으면 부르지 않는다', async () => {
      const d = deps(active(), { env: { ...ENV, supabaseUrl: '' } });
      expectDefault(await buildGuestPage([SLUG], d));
      expect(d.fetch).not.toHaveBeenCalled();
    });
  });

  it('잘못된 slug 는 서버를 부르지 않는다', async () => {
    for (const slugs of [[], ['../etc'], ['"><script>alert(1)</script>'], [SLUG, 'abcDEF654321']]) {
      const d = deps(active());
      const page = await buildGuestPage(slugs, d);
      expect(d.fetch).not.toHaveBeenCalled();
      expect(page.status).toBe(200);
      expect(page.body).not.toContain('<script>alert');
      // 입력 값을 og:url 에 되돌려 쓰지 않는다
      expect(metaOf(page.body, 'og:url')).toBe('https://guest.example.app');
    }
  });
});
