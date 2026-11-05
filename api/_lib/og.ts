/**
 * 하객 링크(/i/<slug>)의 미리보기 태그. 카카오톡 봇은 자바스크립트를 실행하지 않으므로 서버에서 넣는다.
 * 파일 이름이 _ 로 시작하는 폴더라 Vercel 이 Function 으로 만들지 않는다.
 * 어떤 실패에도 던지지 않고 기본 태그를 넣은 화면을 200 으로 돌려준다: 태그보다 하객 화면이 열리는 것이 먼저다.
 */

export interface OgMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  /** 표지 사진 공개 주소. 있으면 JS 를 기다리지 않고 HTML 과 함께 받기 시작한다 */
  preloadImage?: string | null;
}

export interface GuestPageEnv {
  supabaseUrl: string;
  /** publishable 키만 쓴다 */
  supabaseKey: string;
  mediaBaseUrl: string;
  siteUrl: string;
}

export interface GuestPageDeps {
  /** 빌드된 앱 껍데기. 못 읽었으면 null */
  shell: string | null;
  env: GuestPageEnv;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
}

export interface GuestPage {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const DEFAULT_TITLE = 'wuzu 모바일 초대장';
const DEFAULT_DESCRIPTION = '모바일 초대장이 도착했어요';
const DESCRIPTION_MAX = 80;
// 숨김·기간 만료가 미리보기에 늦게 반영되는 시간의 상한이다. 봇 요청이 만료된 내용을 오래 붙들지 않게 짧게 둔다
const CACHE_OK = 'public, max-age=0, s-maxage=60';
const CACHE_FAILED = 'no-store';
/**
 * 함수가 껍데기 파일을 못 읽을 때 준다(includeFiles 가 빠진 배포 등). 미리보기 태그는 그대로 넣는다.
 * 브라우저는 정적 /shell.html 을 받아 이 주소에 그대로 그리므로 하객 화면이 열린다. 그것도 실패하면 안내만 남는다.
 * 태그 값은 이 스크립트 안에 들어가지 않는다.
 */
const SHELL_MISSING_PAGE = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>wuzu</title></head><body><noscript>잠시 후 다시 열어 주세요.</noscript><script>fetch('/shell.html').then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(h){document.open();document.write(h);document.close()}).catch(function(){document.body.textContent='잠시 후 다시 열어 주세요.'})</script></body></html>`;
const SLUG = /^[A-Za-z0-9]{10,64}$/;
const MEDIA_KEY = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*(\/[A-Za-z0-9_-][A-Za-z0-9_.-]*)*$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f\u2028\u2029]+/g;

const noTrailingSlash = (url: string) => url.replace(/\/+$/, '');

function escapeHtml(value: string): string {
  return value
    .replace(CONTROL_CHARS, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 껍데기 파일을 읽는다. 실패하면 null 과 기록 한 줄. 오류 메시지·경로는 남기지 않고 코드만 남긴다 */
export function loadShell(read: () => string, log: (line: string) => void): string | null {
  try {
    return read();
  } catch (error) {
    log(`[guest-page] shell.html 을 읽지 못했다: ${(error as { code?: unknown } | null)?.code ?? 'UNKNOWN'}`);
    return null;
  }
}

/** 서버가 만드는 slug 모양인지. 주소로 들어온 값이라 이 검사를 지나야 서버에 보내고 태그에 쓴다 */
export const isGuestSlug = (slug: string): boolean => SLUG.test(slug);

/** 기존 head 끝에 태그를 넣고 제목을 바꾼다. 값은 모두 이스케이프한다 */
export function renderOg(html: string, meta: OgMeta): string {
  const title = escapeHtml(meta.title);
  const tag = (attr: 'property' | 'name', key: string, value: string) => `<meta ${attr}="${key}" content="${value}">`;
  const tags = [
    tag('property', 'og:type', 'website'),
    tag('property', 'og:site_name', 'wuzu'),
    tag('property', 'og:title', title),
    tag('property', 'og:description', escapeHtml(meta.description)),
    tag('property', 'og:image', escapeHtml(meta.image)),
    tag('property', 'og:image:width', '800'),
    tag('property', 'og:image:height', '400'),
    tag('property', 'og:url', escapeHtml(meta.url)),
    tag('name', 'twitter:card', 'summary_large_image'),
  ].join('');
  const preload = meta.preloadImage ? `<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}" fetchpriority="high">` : '';
  // 값에 든 $& 를 치환 문법으로 읽지 않게 함수로 넘긴다
  return html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`).replace('</head>', () => `${preload}${tags}</head>`);
}

/** r2:// 값만 공개 주소로 바꾼다. 그 밖의 값은 만든 사람이 넣은 임의 주소일 수 있어 쓰지 않는다 */
function mediaUrlOf(ref: unknown, env: GuestPageEnv): string | null {
  if (typeof ref !== 'string' || !ref.startsWith('r2://') || !env.mediaBaseUrl) return null;
  const key = ref.slice('r2://'.length);
  return MEDIA_KEY.test(key) && !key.includes('..') ? `${noTrailingSlash(env.mediaBaseUrl)}/${key}` : null;
}

/** 화면의 CoverSlide·resolvePhoto 와 같은 규칙으로 표지 사진을 고른다. 표지 안의 다른 사진 요소는 보지 않는다 */
function coverPhotoOf(inv: Record<string, unknown>): unknown {
  const cover = (inv.design as { cover?: { mode?: unknown; canvas?: { background?: { kind?: unknown; uri?: unknown } } } } | null | undefined)?.cover;
  if (cover?.mode === 'canvas') return cover.canvas?.background?.kind === 'image' ? cover.canvas.background.uri : null;
  if (inv.themeId !== 'dol' && inv.themeId !== 'meetup') return null;
  return (inv.content as { basic?: { photo?: unknown } } | null | undefined)?.basic?.photo;
}

function descriptionOf(content: unknown): string {
  const greeting = (content as { greeting?: { content?: unknown } } | null | undefined)?.greeting?.content;
  if (typeof greeting !== 'string') return DEFAULT_DESCRIPTION;
  const flat = greeting.replace(/\s+/g, ' ').trim();
  if (!flat) return DEFAULT_DESCRIPTION;
  const chars = Array.from(flat);
  return chars.length > DESCRIPTION_MAX ? `${chars.slice(0, DESCRIPTION_MAX).join('')}…` : flat;
}

type Lookup = { state: 'active'; invitation: Record<string, unknown> } | { state: 'expired' | 'not_found' };

/** guest_invitation 호출. 약속한 모양이 아니면 던진다 */
async function lookup(slug: string, deps: GuestPageDeps): Promise<Lookup> {
  const { supabaseUrl, supabaseKey } = deps.env;
  if (!supabaseUrl || !supabaseKey) throw new Error('NO_ENV');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('TIMEOUT'));
    }, deps.timeoutMs);
  });
  const request = (async () => {
    const res = await deps.fetch(`${noTrailingSlash(supabaseUrl)}/rest/v1/rpc/guest_invitation`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('BAD_STATUS');
    return (await res.json()) as unknown;
  })();
  // 시간 제한이 먼저 끝나면 끊긴 요청의 거절이 처리되지 않은 채 남지 않게 한다
  request.catch(() => {});
  const data = (await Promise.race([request, timeout]).finally(() => clearTimeout(timer))) as {
    state?: unknown;
    invitation?: { name?: unknown };
  } | null;
  if (data?.state === 'expired' || data?.state === 'not_found') return { state: data.state };
  if (data?.state === 'active' && typeof data.invitation?.name === 'string') {
    return { state: 'active', invitation: data.invitation as Record<string, unknown> };
  }
  throw new Error('BAD_SHAPE');
}

/**
 * 하객 화면 HTML 을 만든다. slugs 는 요청의 slug 값 전부다: 주소에 slug 를 덧붙인 요청을 믿지 않으려고 하나일 때만 쓴다.
 * 초대장 정보는 state 가 active 일 때만 읽는다.
 */
export async function buildGuestPage(slugs: string[], deps: GuestPageDeps): Promise<GuestPage> {
  const site = noTrailingSlash(deps.env.siteUrl);
  const slug = slugs.length === 1 && isGuestSlug(slugs[0]) ? slugs[0] : null;
  const defaults: OgMeta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: `${site}/link-default.jpg`,
    url: slug ? `${site}/i/${slug}` : site,
  };
  let meta = defaults;
  let cache = CACHE_OK;
  if (slug) {
    try {
      const found = await lookup(slug, deps);
      if (found.state === 'active') {
        const inv = found.invitation;
        meta = {
          ...defaults,
          title: String(inv.name),
          description: descriptionOf(inv.content),
          image: mediaUrlOf(inv.linkThumb, deps.env) ?? defaults.image,
          preloadImage: mediaUrlOf(coverPhotoOf(inv), deps.env),
        };
      }
    } catch {
      // 장애 결과가 캐시에 남아 복구 뒤에도 기본 태그가 나가지 않게
      cache = CACHE_FAILED;
    }
  }
  return {
    status: 200,
    // 껍데기가 없는 응답이 CDN 에 남으면 모든 하객이 받고 장애도 가려진다
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': deps.shell === null ? CACHE_FAILED : cache },
    body: renderOg(deps.shell ?? SHELL_MISSING_PAGE, meta),
  };
}
