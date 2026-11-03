// 모든 테스트 공통: 기기 저장소 대역, 언어는 한국어로 고정(기존 테스트가 한국어 문구·서식을 기대)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// SDK 58: expo-asset 이 쓰는 RN 자산 저장소를 jest-expo 대역이 덮지 못해 직접 대역을 둔다
jest.mock('react-native/src/private/assets/AssetRegistry', () => ({
  AssetRegistry: {
    registerAsset: () => 1,
    getAssetByID: () => ({
      httpServerLocation: '/assets',
      scales: [1],
      fileHashes: ['md5'],
      name: 'name',
      type: 'type',
      hash: 'md5',
      uri: 'uri',
      width: 1,
      height: 1,
    }),
  },
}));

// 결혼식 외 테마 정의 등록 (앱은 _layout 에서)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./src/features/invitation/registerThemes');

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./src/i18n').useLocale.setState({ locale: 'ko' });
});
