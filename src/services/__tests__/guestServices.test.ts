import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const URL_VALUE = 'https://db.example.co';

function load() {
  process.env.EXPO_PUBLIC_SUPABASE_URL = URL_VALUE;
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
  let mod!: typeof import('../../guest-web/services');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../guest-web/services');
  });
  return mod;
}

describe('공개 웹 전용 서비스', () => {
  const realFetch = global.fetch;
  const env = { url: process.env.EXPO_PUBLIC_SUPABASE_URL, key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY };
  afterEach(() => {
    global.fetch = realFetch;
    if (env.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = env.url;
    if (env.key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = env.key;
  });
  const answer = (status: number, body: unknown) => {
    const fetchMock = jest.fn(async () => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) }) as Response);
    global.fetch = fetchMock;
    return fetchMock;
  };

  it('mock 이 아니고, publishable 키로 POST 한다', async () => {
    const fetchMock = answer(200, { state: 'not_found' });
    const { invitationService, usingMockAuth } = load();
    expect(usingMockAuth).toBe(false);
    expect(await invitationService.getBySlug('abcDEF123456')).toEqual({ state: 'not_found' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${URL_VALUE}/rest/v1/rpc/guest_invitation`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ p_slug: 'abcDEF123456' }));
    expect(init.headers).toEqual({ apikey: 'sb_publishable_test', 'Content-Type': 'application/json' });
  });

  it('서버 오류는 DB 메시지로 던진다', async () => {
    answer(400, { message: 'RATE_LIMITED' });
    await expect(load().invitationService.getBySlug('abcDEF123456')).rejects.toThrow('RATE_LIMITED');
  });

  it('본문이 JSON 이 아닌 오류도 던진다', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 502, text: async () => '<html>' }) as Response);
    await expect(load().invitationService.getBySlug('abcDEF123456')).rejects.toThrow('502');
  });

  it('네트워크 오류를 그대로 던진다', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });
    await expect(load().invitationService.getBySlug('abcDEF123456')).rejects.toThrow('offline');
  });

  it('본문 없는 성공 응답은 null 이다', async () => {
    answer(200, undefined);
    await expect(load().invitationService.listGuestbook('x', 'guest')).resolves.toBeNull();
  });

  it('하객 화면이 services 에서 가져오는 이름을 모두 내보낸다', () => {
    answer(200, null);
    const mod = load() as unknown as Record<string, unknown>;
    const source = fs.readFileSync(path.join(ROOT, 'src/features/invitation/GuestInvitationScreen.tsx'), 'utf8');
    const names = /import [{]([^}]*)[}] from '[.][.]\/[.][.]\/services'/
      .exec(source)![1]
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && n !== 'GuestbookEntry');
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(mod[name]).toBeDefined();
  });

  it('하객 경로에서 services 묶음을 부르는 파일은 하객 화면뿐이다', () => {
    const reach = new Set<string>();
    const importers: string[] = [];
    const visit = (file: string) => {
      if (reach.has(file)) return;
      reach.add(file);
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/(?:from|import) '([.][^']+)'/g)) {
        const base = path.join(path.dirname(file), m[1]);
        const target = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find((c) => fs.existsSync(c));
        if (!target) continue;
        if (target === path.join(ROOT, 'src/services/index.ts')) importers.push(path.relative(ROOT, file).split(path.sep).join('/'));
        else visit(target);
      }
    };
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    walk(path.join(ROOT, 'src/guest-site')).forEach(visit);
    expect(importers).toEqual(['src/features/invitation/GuestInvitationScreen.tsx']);
  });
});
