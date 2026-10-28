import { translate } from '..';

// 사용자가 쓴 문장은 영어 모드에서도 그대로여야 한다 (짧은 패턴이 아무 문장에나 걸리면 안 됨)
const USER_SENTENCES = [
  '두 분의 앞날에 행복만 가득하길',
  '바쁘신 와중에 시간 내주시면 감사하겠습니다',
  '그랜드볼룸 연회장',
  '저희 두 사람이 사랑의 이름으로 하나가 되려 합니다.',
  '홍길동님, 결혼 축하해요!',
  '3층 웨딩홀 5분 거리',
];

describe('사용자 글 보호', () => {
  it.each(USER_SENTENCES)('바뀌지 않는다: %s', (s) => {
    expect(translate(s, 'en')).toBe(s);
  });
  it('숫자만 끼는 문장은 여전히 번역', () => {
    expect(translate('레터 300개가 충전되었어요.', 'en')).toBe('300 letters added.');
    expect(translate('5MB 이하로 업로드해주세요.', 'en')).toBe('Please upload a file of 5MB or less.');
  });
  it('짧은 패턴은 숫자만 낄 때 번역 (1장·1,000원)', () => {
    expect(translate('1장', 'en')).toBe('1');
    expect(translate('12,000원', 'en')).toBe('₩12,000');
    expect(translate('총장', 'en')).toBe('총장');
  });
  it('한 글자 낱말(탭 이름)은 정확히 같을 때만', () => {
    expect(translate('홈', 'en')).toBe('Home');
  });
  it('한 글자 단위·요일은 조각으로 번역하지 않는다', () => {
    expect(translate('일', 'en')).toBe('일');
    expect(translate('월', 'en')).toBe('월');
  });
});
