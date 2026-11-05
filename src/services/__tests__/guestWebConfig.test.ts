import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkGuestDist, checkGuestEnv, preconnectTags } = require('../../../scripts/guest-web-rules.js') as {
  preconnectTags: (supabaseUrl: string, mediaUrl: string) => string;
  checkGuestDist: (files: string[]) => string[];
  checkGuestEnv: (env: Record<string, string | undefined>) => string[];
};

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file));
const vercel = JSON.parse(read('vercel.json').toString());

describe('vercel.json', () => {
  it('빌드 명령과 출력 폴더가 둘 다 있고, 출력은 dist 뿐이다', () => {
    expect(vercel.buildCommand).toBe('npm run build:guest-web');
    expect(vercel.outputDirectory).toBe('dist');
    expect(vercel.framework).toBeNull();
    const pkg = JSON.parse(read('package.json').toString());
    expect(pkg.scripts['build:guest-web']).toBe('node scripts/build-guest-web.mjs');
  });

  it('공개 경로는 하객 링크와 처리방침뿐이고, 나머지를 앱 껍데기로 보내는 규칙이 없다', () => {
    expect(vercel.rewrites).toEqual([
      { source: '/i/:slug', destination: '/api/guest-page?slug=:slug' },
      { source: '/privacy', destination: '/shell.html' },
    ]);
    expect(vercel.routes).toBeUndefined();
    expect(vercel.redirects).toBeUndefined();
    expect(vercel.cleanUrls).toBeFalsy();
  });

  it('함수는 하나이고 빌드된 껍데기 파일만 싣는다. Supabase 와 같은 서울에서 돈다', () => {
    expect(vercel.functions).toEqual({
      'api/guest-page.ts': { maxDuration: 10, includeFiles: 'dist/shell.html' },
    });
    expect(vercel.regions).toEqual(['icn1']);
    expect(fs.readdirSync(path.join(ROOT, 'api')).sort()).toEqual(['_lib', 'guest-page.ts']);
  });

  it('이름에 해시가 든 파일만 오래 캐시한다', () => {
    const cached = vercel.headers.filter((h: { headers: { key: string; value: string }[] }) => h.headers.some((x) => x.key === 'Cache-Control'));
    expect(cached.map((h: { source: string }) => h.source).sort()).toEqual(['/_expo/static/(.*)', '/assets/(.*)']);
  });

  it('어드민 프로젝트는 저장소 맨 위 무시 목록을 물려받지 않는다', () => {
    // 맨 위 .vercelignore 에 admin 이 있고, Vercel 은 프로젝트 폴더에 파일이 없으면 맨 위 파일을 쓴다
    const ignore = read('.vercelignore').toString().split(/\r?\n/);
    for (const entry of ['/admin', '/docs', '/supabase/migrations', '/supabase/test', '/supabase/manual']) expect(ignore).toContain(entry);
    const adminIgnore = read('admin/.vercelignore').toString().split(/\r?\n/);
    expect(adminIgnore.filter((l) => l && !l.startsWith('#'))).toEqual([]);
  });
});

describe('빌드 출력 검사', () => {
  const GOOD = ['shell.html', '404.html', 'link-default.jpg', 'favicon.ico', '_expo/static/js/web/entry-0abc.js', '_expo/static/js/web/[slug]-0abc.js', 'assets/assets/fonts/Pretendard-Regular.abc.otf'];

  it('정상 목록은 통과한다', () => {
    expect(checkGuestDist(GOOD)).toEqual([]);
  });

  it('필수 파일이 빠지면 막는다', () => {
    expect(checkGuestDist(GOOD.filter((f) => f !== 'shell.html'))).toEqual(['빠진 파일: shell.html']);
    expect(checkGuestDist(GOOD.filter((f) => f !== '404.html'))).toEqual(['빠진 파일: 404.html']);
    expect(checkGuestDist(GOOD.filter((f) => f !== 'link-default.jpg'))).toEqual(['빠진 파일: link-default.jpg']);
  });

  it.each([
    'index.html',
    'home.html',
    'metadata.json',
    '.env',
    '.env.local',
    'package.json',
    'CLAUDE.md',
    'vercel.json',
    'admin/page.tsx',
    'supabase/migrations/a.sql',
    'docs/a.md',
    'api/guest-page.ts',
    'src/app/_layout.tsx',
    'assets/.env',
    '_expo/.hidden',
    '_expo/static/js/web/entry-0abc.js.map',
    '_expo/static/js/web/home-0abc.js',
    '_expo/static/js/web/login-0abc.js',
    'assets/secret.sql',
  ])('허용되지 않은 파일 %s 는 막는다', (file) => {
    expect(checkGuestDist([...GOOD, file])).toEqual([`공개되면 안 되는 파일: ${file}`]);
  });
});

describe('미리 연결', () => {
  it('Supabase 는 fetch 라 crossorigin, 사진은 일반 이미지 요청이라 crossorigin 없이 연결한다', () => {
    expect(preconnectTags('https://x.supabase.co/', 'https://pub-x.r2.dev/a')).toBe(
      '<link rel="preconnect" href="https://x.supabase.co" crossorigin><link rel="preconnect" href="https://pub-x.r2.dev">',
    );
  });
});

describe('빌드 환경 변수 검사', () => {
  const GOOD = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_abc',
    EXPO_PUBLIC_MEDIA_BASE_URL: 'https://pub-x.r2.dev',
    EXPO_PUBLIC_GUEST_WEB_URL: 'https://wuzu-guest.vercel.app',
  };

  it('네 값이 다 있으면 통과한다', () => {
    expect(checkGuestEnv(GOOD)).toEqual([]);
  });

  it.each(Object.keys(GOOD))('%s 가 비면 막는다 (mock 으로 공개되지 않게)', (key) => {
    expect(checkGuestEnv({ ...GOOD, [key]: '' })).toHaveLength(1);
    expect(checkGuestEnv({ ...GOOD, [key]: undefined })[0]).toContain(key);
  });

  it('주소는 https 만 받는다 (이 컴퓨터 시험 주소는 예외)', () => {
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_GUEST_WEB_URL: 'http://wuzu.example' })).toHaveLength(1);
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_MEDIA_BASE_URL: 'not a url' })).toHaveLength(1);
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9000' })).toEqual([]);
  });

  it('비밀 키는 막는다', () => {
    const jwt = (role: string) => `a.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.c`;
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toHaveLength(1);
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') })).toHaveLength(1);
    expect(checkGuestEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('anon') })).toEqual([]);
  });
});

describe('공개 사이트 경로', () => {
  const walk = (dir: string, base = ''): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const rel = base ? `${base}/${e.name}` : e.name;
      return e.isDirectory() ? (e.name === '__tests__' ? [] : walk(path.join(dir, e.name), rel)) : [rel];
    });

  it('공개 사이트 라우터에는 하객 링크·처리방침·없는 주소만 있다', () => {
    expect(walk(path.join(ROOT, 'src/guest-site')).sort()).toEqual(['+not-found.tsx', '_layout.tsx', 'i/[slug].tsx', 'privacy.tsx']);
  });

  it('EXPO_PUBLIC_GUEST_SITE=1 일 때만 라우터 폴더를 바꾸고 사이트맵을 끈다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appConfig = require('../../../app.config.js') as (ctx: { config: Record<string, unknown> }) => {
      extra?: { router?: Record<string, unknown> };
    };
    const before = process.env.EXPO_PUBLIC_GUEST_SITE;
    try {
      delete process.env.EXPO_PUBLIC_GUEST_SITE;
      expect(appConfig({ config: { name: 'wuzu' } })).toEqual({ name: 'wuzu' });
      process.env.EXPO_PUBLIC_GUEST_SITE = '1';
      expect(appConfig({ config: { name: 'wuzu', extra: { a: 1 } } })).toEqual({
        name: 'wuzu',
        extra: { a: 1, router: { root: 'src/guest-site', sitemap: false } },
      });
    } finally {
      if (before === undefined) delete process.env.EXPO_PUBLIC_GUEST_SITE;
      else process.env.EXPO_PUBLIC_GUEST_SITE = before;
    }
  });
});

describe('공개 웹 번들 줄이기', () => {
  const walkSrc = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? (e.name === '__tests__' ? [] : walkSrc(p)) : /[.]tsx?$/.test(e.name) ? [p] : [];
    });

  it('앱 코드가 아이콘 묶음에서 가져오는 세트는 Ionicons 뿐이다 (대체 파일이 그것만 내보낸다)', () => {
    const names = new Set<string>();
    for (const file of walkSrc(path.join(ROOT, 'src'))) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/import [{]([^}]*)[}] from '@expo[/]vector-icons'/g)) {
        m[1].split(',').forEach((n) => names.add(n.trim()));
      }
    }
    expect([...names]).toEqual(['Ionicons']);
  });

  it('하객 경로는 제스처 처리기를 불러오지 않는다', () => {
    const reach = new Set<string>();
    const visit = (file: string) => {
      if (reach.has(file)) return;
      reach.add(file);
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/from '([.][^']+)'/g)) {
        const base = path.join(path.dirname(file), m[1]);
        const target = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find((c) => fs.existsSync(c));
        if (target) visit(target);
      }
    };
    for (const file of walkSrc(path.join(ROOT, 'src/guest-site'))) visit(file);
    const bad = [...reach].filter((f) => /from 'react-native-(gesture-handler|reanimated)'/.test(fs.readFileSync(f, 'utf8')));
    expect(bad.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

describe('기본 미리보기 이미지', () => {
  it('800×400 JPEG 이고 작다', () => {
    const buf = read('assets/link-default.jpg');
    expect(buf.length).toBeLessThan(60 * 1024);
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    // SOF 표시를 찾아 크기를 읽는다
    let i = 2;
    let size: [number, number] | null = null;
    while (i < buf.length && !size) {
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) size = [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + len;
    }
    expect(size).toEqual([800, 400]);
  });
});
