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

module.exports = config;
