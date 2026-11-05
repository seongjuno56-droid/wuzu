/**
 * 공개 웹(wuzu-guest) 빌드. vercel.json 의 buildCommand 이다. `npm run build:guest-web`
 * 1. 환경 변수를 검사한다. 비어 있으면 mock 으로 동작하므로 빌드를 실패시킨다.
 * 2. 라우터 폴더를 src/guest-site 로 바꿔 내보낸다(app.config.js). 앱 화면은 번들에 들어가지 않는다.
 * 3. index.html 을 shell.html 로 바꾼다. Vercel 은 정적 파일을 rewrite 보다 먼저 보므로,
 *    index.html 이 있으면 `/` 가 앱 껍데기를 준다. 이름을 바꾸면 `/` 는 404.html 로 간다.
 * 4. dist 의 파일이 허용 목록 안인지 검사한다. 어긋나면 빌드를 실패시켜 배포되지 않게 한다.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { checkGuestDist, checkGuestEnv } = require('./guest-web-rules.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function fail(problems) {
  for (const p of problems) console.error(`[build-guest-web] ${p}`);
  process.exit(1);
}

// Vercel 은 환경 변수를 그대로 주고, 이 컴퓨터에서는 .env.local 에 있다. 이미 있는 값을 덮지 않는다
for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const envProblems = checkGuestEnv(process.env);
if (envProblems.length) fail(envProblems);

rmSync(DIST, { recursive: true, force: true });
const exported = spawnSync('npx expo export -p web --output-dir dist --clear', {
  cwd: ROOT,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_GUEST_SITE: '1', NODE_ENV: 'production' },
});
if (exported.status !== 0) fail(['expo export 실패']);

// 빌드 정보 파일. 하객 화면이 읽지 않는다
rmSync(path.join(DIST, 'metadata.json'), { force: true });

const origin = (url) => new URL(url).origin;
const preconnect = [...new Set([process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_MEDIA_BASE_URL].map(origin))]
  .map((url) => `<link rel="preconnect" href="${url}" crossorigin>`)
  .join('');
// 라우터가 뿌리·하객 화면 JS 를 entry 실행 뒤에야 부르므로, 미리 받아 왕복을 줄인다
const JS_DIR = '_expo/static/js/web';
const preload = readdirSync(path.join(DIST, JS_DIR))
  .filter((name) => name.endsWith('.js') && (name.startsWith('_layout-') || name.startsWith('[slug]-')))
  .map((name) => `<link rel="preload" as="script" href="/${JS_DIR}/${name}">`)
  .join('');
const shell = readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace('<html lang="en">', '<html lang="ko">')
  .replace('</head>', () => `${preconnect}${preload}</head>`);
writeFileSync(path.join(DIST, 'index.html'), shell);
renameSync(path.join(DIST, 'index.html'), path.join(DIST, 'shell.html'));

copyFileSync(path.join(ROOT, 'assets/link-default.jpg'), path.join(DIST, 'link-default.jpg'));

// 정해진 주소 말고는 모두 이 안내다. 앱으로 들어가는 길이 없게 스크립트를 넣지 않는다
writeFileSync(
  path.join(DIST, '404.html'),
  `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>wuzu</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;box-sizing:border-box;background:#F7F7F7;color:#000;font-family:system-ui,sans-serif;text-align:center}h1{margin:0;font-size:18px}p{margin:0;font-size:14px;color:#666}</style>
</head>
<body>
<h1>페이지를 찾을 수 없어요</h1>
<p>삭제되었거나 주소가 잘못되었어요.</p>
</body>
</html>
`,
);

const files = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => path.relative(DIST, path.join(e.parentPath, e.name)).split(path.sep).join('/'));
const distProblems = checkGuestDist(files);
if (distProblems.length) fail(distProblems);

console.log(`[build-guest-web] 완료: 파일 ${files.length}개`);
