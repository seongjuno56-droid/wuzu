// 모든 테스트 공통: 기기 저장소 대역, 언어는 한국어로 고정(기존 테스트가 한국어 문구·서식을 기대)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// 테스트가 그린 화면을 기억해 두었다가 끝날 때 내린다(맨 아래 afterEach).
// 내리지 않으면 스토어 변화가 act 밖에서 렌더를 예약하고, 그 렌더가 테스트 환경이 닫힌 뒤 돌아 require 에서 터진다.
// 이 오류는 같은 작업자에서 돌고 있는 다른 스위트의 "Test suite failed to run"(window.dispatchEvent is not a function)으로 나타난다
const mockMountedRenderers: { unmount(): void }[] = [];
jest.mock('react-test-renderer', () => {
  const actual = jest.requireActual('react-test-renderer');
  return {
    ...actual,
    create: (...args: unknown[]) => {
      const renderer = actual.create(...args);
      mockMountedRenderers.push(renderer);
      return renderer;
    },
  };
});

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

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { act } = require('react-test-renderer');
  act(() => {
    // 이미 직접 내린 화면에 다시 불러도 아무 일도 없다
    for (const renderer of mockMountedRenderers.splice(0)) renderer.unmount();
  });
});
