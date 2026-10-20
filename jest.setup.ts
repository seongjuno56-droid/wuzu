// 모든 테스트 공통: 기기 저장소 대역, 언어는 한국어로 고정(기존 테스트가 한국어 문구·서식을 기대)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./src/i18n').useLocale.setState({ locale: 'ko' });
});
