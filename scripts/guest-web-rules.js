/**
 * 공개 웹 빌드의 안전 검사. 빌드(build-guest-web.mjs)가 부르고 테스트(guestWebConfig.test.ts)가 고정한다.
 * dist 에 있는 파일은 전부 인터넷에 공개되므로 허용 목록으로 본다. 목록에 없으면 빌드를 실패시켜 배포되지 않게 한다.
 */

const REQUIRED_FILES = ['shell.html', '404.html', 'link-default.jpg'];
// 맨 위에 둘 수 있는 파일
const ROOT_FILES = new Set([...REQUIRED_FILES, 'favicon.ico']);
// 해시가 든 빌드 산출물. 소스 맵·숨김 파일·설정·코드 파일은 여기서도 받지 않는다.
// JS 는 하객 경로의 묶음만 받는다. 라우터 폴더 설정이 풀려 앱 화면이 들어오면 home-… 같은 묶음이 생겨 여기서 걸린다
const JS_FILE = /^_expo\/static\/js\/web\/(entry|__common|__expo-metro-runtime|_layout|\[slug\]|privacy|\+not-found)-[0-9a-f]+\.js$/;
const ASSET_FILE = /^assets\/([^/.][^/]*\/)*[^/.][^/]*\.(png|jpe?g|gif|webp|svg|ico|otf|ttf|woff2?|mp3|wav|m4a|mp4)$/;

/** 문제 목록을 돌려준다. 비어 있으면 통과 */
function checkGuestDist(files) {
  const problems = [];
  for (const name of REQUIRED_FILES) {
    if (!files.includes(name)) problems.push(`빠진 파일: ${name}`);
  }
  for (const file of files) {
    if (!ROOT_FILES.has(file) && !JS_FILE.test(file) && !ASSET_FILE.test(file)) problems.push(`공개되면 안 되는 파일: ${file}`);
  }
  return problems;
}

/** 시험할 때만 이 컴퓨터 주소를 받는다. 실제 주소는 https 여야 한다 */
function isPublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role';
  } catch {
    return false;
  }
}

const URL_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_MEDIA_BASE_URL', 'EXPO_PUBLIC_GUEST_WEB_URL'];
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

/**
 * 값이 비면 앱이 mock 서비스로 동작한다. 공개 웹이 mock 으로 나가면 하객이 빈 화면을 보므로 빌드를 막는다.
 * 값을 문제 목록에 넣지 않는다(빌드 기록에 남지 않게).
 */
function checkGuestEnv(env) {
  const problems = [];
  for (const key of URL_KEYS) {
    if (!env[key]) problems.push(`환경 변수가 비어 있다: ${key}`);
    else if (!isPublicUrl(env[key])) problems.push(`https 주소가 아니다: ${key}`);
  }
  if (!env[ANON_KEY]) problems.push(`환경 변수가 비어 있다: ${ANON_KEY}`);
  else if (isSecretKey(env[ANON_KEY])) problems.push(`비밀 키는 넣으면 안 된다: ${ANON_KEY}`);
  return problems;
}

module.exports = { checkGuestDist, checkGuestEnv };
