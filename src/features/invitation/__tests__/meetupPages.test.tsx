import { useLocale } from '../../../i18n';
import { render } from '../../../test/ui';
import type { MeetupContent } from '../model';
import { createInvitation } from '../themes';
import { PageContent } from '../view/PageContent';

const inv = (patch: Partial<MeetupContent> = {}) => {
  const i = createInvitation({
    id: 'i',
    ownerId: 'u',
    themeId: 'meetup',
    templateId: 'meetup-1',
    today: new Date(2026, 9, 26),
  });
  i.content = { ...(i.content as MeetupContent), ...patch };
  return i;
};

describe('모임 하객 화면', () => {
  it('일정표 장: 제목이 일정표', () => {
    const ui = render(<PageContent page="program" invitation={inv()} />);
    expect(ui.getText('일정표')).toBeTruthy();
    expect(ui.getText('모여서 건배')).toBeTruthy();
  });
  it('안내사항 장: 카드 제목·내용', () => {
    const ui = render(<PageContent page="notices" invitation={inv()} />);
    expect(ui.getText('회비')).toBeTruthy();
    expect(ui.getText('준비물')).toBeTruthy();
  });
  it('회비 계좌 장: 금액·계좌·복사, 반쪽 계좌면 계좌 줄 없음', () => {
    const full = inv({ account: { amount: '1인 3만원', bank: '국민', number: '123-45', holder: '김모임' } });
    const ui = render(<PageContent page="account" invitation={full} />);
    expect(ui.getText('1인 3만원')).toBeTruthy();
    expect(ui.getLabel('김모임 계좌 복사하기')).toBeTruthy();
    const half = render(
      <PageContent
        page="account"
        invitation={inv({ account: { amount: '', bank: '국민', number: '', holder: '' } })}
      />,
    );
    expect(half.queryLabel('계좌 복사하기')).toBeNull();
  });
  it('참석 여부 장: 제목이 참석 여부', () => {
    const ui = render(
      <PageContent page="rsvp" invitation={inv()} rsvp={{ mine: null, closed: false, onOpen: () => {} }} />,
    );
    expect(ui.getText('참석 여부')).toBeTruthy();
    expect(ui.getText('참석 여부 알려주기')).toBeTruthy();
  });
  it('초대 문구 서명은 주최', () => {
    const c = inv().content as MeetupContent;
    const ui = render(<PageContent page="greeting" invitation={inv({ basic: { ...c.basic, host: '03학번 동기' } })} />);
    expect(ui.getText('03학번 동기')).toBeTruthy();
  });
});

describe('계좌 줄은 사용자 글을 번역하지 않는다', () => {
  afterEach(() => useLocale.setState({ locale: 'ko' }));
  it('영어 모드에서 예금주·은행 이름이 사전 낱말과 같아도 그대로', () => {
    useLocale.setState({ locale: 'en' });
    const full = inv({ account: { amount: '', bank: '참석', number: '123-45', holder: '회비' } });
    const ui = render(<PageContent page="account" invitation={full} />);
    expect(ui.queryText('참석 123-45')).toBeTruthy();
    expect(ui.queryText('Account holder 회비')).toBeTruthy();
  });
});
