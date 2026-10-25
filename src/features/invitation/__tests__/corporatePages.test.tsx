import { press, render } from '../../../test/ui';
import type { RsvpResponse } from '../../rsvp/rsvp';
import type { CorporateContent } from '../model';
import { createInvitation } from '../themes';
import { PageContent } from '../view/PageContent';

const inv = () => {
  const i = createInvitation({
    id: 'i',
    ownerId: 'u',
    themeId: 'corporate',
    templateId: 'corporate-1',
    today: new Date(2026, 9, 25),
  });
  const c = i.content as CorporateContent;
  c.ceremony = { ...c.ceremony, venue: '그랜드홀', audience: '파트너사 임직원', dressCode: '비즈니스 캐주얼' };
  c.contact = { name: '행사 사무국', phone: '02-123-4567', email: 'event@wuzu.kr' };
  c.directions = { parking: '지하 2층', transit: '' };
  return i;
};
const mine: RsvpResponse = {
  id: 'r',
  invitationId: 'i',
  name: '홍길동',
  attending: true,
  org: '우주',
  phone: '010-1234-5678',
  companions: 0,
  source: 'guest',
  createdAt: '',
  updatedAt: '',
};

describe('기업 하객 화면', () => {
  it('행사 개요: 대상·드레스코드가 보이고 지도는 오시는 길에만', () => {
    const ui = render(<PageContent page="ceremony" invitation={inv()} />);
    expect(ui.getText('파트너사 임직원')).toBeTruthy();
    expect(ui.getText('비즈니스 캐주얼')).toBeTruthy();
    expect(ui.queryText('카카오맵')).toBeNull();
  });
  it('오시는 길: 지도 + 주차 (비운 대중교통은 안 보임)', () => {
    const ui = render(<PageContent page="directions" invitation={inv()} />);
    expect(ui.getText('카카오맵')).toBeTruthy();
    expect(ui.getText('지하 2층')).toBeTruthy();
    expect(ui.queryText('대중교통')).toBeNull();
  });
  it('프로그램: 시간과 제목', () => {
    const ui = render(<PageContent page="program" invitation={inv()} />);
    expect(ui.getText('14:30')).toBeTruthy();
    expect(ui.getText('개회사')).toBeTruthy();
  });
  it('문의처: 전화·메일 버튼', () => {
    const ui = render(<PageContent page="contact" invitation={inv()} />);
    expect(ui.getLabel('전화 걸기')).toBeTruthy();
    expect(ui.getLabel('메일 보내기')).toBeTruthy();
  });
  it('참석 신청: 처음엔 신청 버튼, 낸 뒤엔 낸 내용과 고치기, 마감이면 고치기 없음', () => {
    const onOpen = jest.fn();
    const ui = render(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine: null, closed: false, onOpen }} />);
    press(ui.getText('참석 신청하기'));
    expect(onOpen).toHaveBeenCalled();
    ui.rerender(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine, closed: false, onOpen }} />);
    expect(ui.getText('응답을 보냈어요')).toBeTruthy();
    expect(ui.getText('응답 고치기')).toBeTruthy();
    ui.rerender(<PageContent page="rsvp" invitation={inv()} rsvp={{ mine, closed: true, onOpen }} />);
    expect(ui.getText('마감되었어요')).toBeTruthy();
    expect(ui.queryText('응답 고치기')).toBeNull();
  });
  it('참석 신청: 연결이 없으면(미리보기) 안내만', () => {
    const ui = render(<PageContent page="rsvp" invitation={inv()} />);
    expect(ui.getText('초대장을 활성화하면 하객이 신청할 수 있어요.')).toBeTruthy();
  });
});
