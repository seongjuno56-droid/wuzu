// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 앱 코드가 아닌 폴더(개발 로그, 브라우저 테스트 캡처, 문서)는 감시·번들 대상에서 제외.
// 이 폴더들의 잦은 파일 쓰기가 Metro를 바쁘게 만들어 새로고침이 느려지는 것을 막는다.
const ignored = ['.superpowers', '.playwright-mcp', 'docs'].map((dir) =>
  new RegExp(`^${path.join(__dirname, dir).replace(/[\\/]/g, '[\\\\/]').replace(/\./g, '\\.')}[\\\\/].*`),
);
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  ...ignored,
];

// 공개 웹 빌드(scripts/build-guest-web.mjs)에서만: 하객이 받는 JS 를 줄인다
if (process.env.EXPO_PUBLIC_GUEST_SITE === '1') {
  const vectorIcons = path.join(__dirname, 'src/guest-web/vectorIcons.ts');
  const appServices = path.join(__dirname, 'src/services/index.ts');
  const guestServices = path.join(__dirname, 'src/guest-web/services.ts');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolve = upstream ?? context.resolveRequest;
    if (moduleName === '@expo/vector-icons') return { type: 'sourceFile', filePath: vectorIcons };
    const resolved = resolve(context, moduleName, platform);
    return resolved.type === 'sourceFile' && resolved.filePath === appServices ? { ...resolved, filePath: guestServices } : resolved;
  };
}

module.exports = config;
