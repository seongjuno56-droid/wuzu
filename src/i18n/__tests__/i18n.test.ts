import { EN, translate, translateChildren } from '..';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractKoreanKeys } = require('../../../scripts/extract-ko.js') as {
  extractKoreanKeys: () => Record<string, string>;
};

describe('번역', () => {
  it('한국어는 그대로, 영어는 사전에서', () => {
    expect(translate('나의 초대장', 'ko')).toBe('나의 초대장');
    expect(translate('나의 초대장', 'en')).toBe('My Invitations');
  });
  it('앞뒤 공백은 지키고 가운데만 번역 (JSX 조각)', () => {
    expect(translate('제작일시 ', 'en')).toBe('Created ');
  });
  it('자리 표시 패턴: 끼어든 값은 그대로, 사전에 있는 값은 다시 번역', () => {
    expect(translate('홍길동님 반가워요.', 'en')).toBe('홍길동님 반가워요.'); // 이 문장은 조각으로 쓰여 패턴이 아님
    expect(translate('레터 300개가 충전되었어요.', 'en')).toBe('300 letters added.');
    expect(translate('[공지] 우쥬 서비스 오픈 안내', 'en')).toBe('[Notice] WUZU is now open');
  });
  it('사전에 없는 문구(사용자 입력 등)는 원문 그대로', () => {
    expect(translate('우리 결혼합니다 :)', 'en')).toBe('우리 결혼합니다 :)');
  });
  it('children 배열의 문자열 조각만 번역', () => {
    expect(translateChildren(['레터 ', 200], 'en')).toEqual(['Letters ', 200]);
  });
});

describe('번역 누락 검사', () => {
  it('코드 속 한국어 화면 문구는 모두 영어 사전에 있다', () => {
    const keys = Object.keys(extractKoreanKeys());
    // 요일·날짜 단위는 언어별 서식 함수가 맡는다(i18n-ignore) — 그 밖엔 한 글자도 빠짐없이
    const missing = keys.filter((k) => !(k in EN));
    // 빠진 문구가 있으면 src/i18n/en/*.ts 에 더한다
    expect(missing).toEqual([]);
  });
});
