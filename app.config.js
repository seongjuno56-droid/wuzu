/**
 * 설정은 app.json 에 있다. 공개 웹 빌드(scripts/build-guest-web.mjs)일 때만 라우터 폴더를 하객 전용으로 바꾼다.
 * 앱 화면이 번들에 아예 들어가지 않으므로 공개 주소에서 로그인·작성·지갑으로 갈 수 없다.
 */
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_GUEST_SITE !== '1') return config;
  return {
    ...config,
    extra: { ...config.extra, router: { root: 'src/guest-site', sitemap: false } },
  };
};
