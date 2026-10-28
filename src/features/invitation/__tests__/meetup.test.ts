// src/features/invitation/__tests__/meetup.test.ts
import { useLocale } from '../../../i18n';
import { defaultMeetupContent, validateMeetup } from '../meetup';
import type { MeetupContent } from '../model';
import { createInvitation, sectionTabs, themeDef } from '../themes';

const today = new Date(2026, 9, 26);
const base = () => defaultMeetupContent(today);

describe('모임', () => {
  afterEach(() => useLocale.setState({ locale: 'ko' }));

  it('기본값: 일정표 예시 3개, 안내사항 예시 회비·준비물, 마감 없음, 초대 문구 미리 채움', () => {
    const c = base();
    expect(c.theme).toBe('meetup');
    expect(c.program.items).toHaveLength(3);
    expect(c.notices.items.map((n) => n.title)).toEqual(['회비', '준비물']);
    expect(c.rsvp.deadline).toBe('');
    expect(c.greeting.content.length).toBeGreaterThan(0);
    expect(c.ceremony.time).toBe('19:00');
  });
  it('영어 사용자는 초대 문구·일정표·안내사항 예시·엔딩이 영어', () => {
    useLocale.setState({ locale: 'en' });
    const c = base();
    const texts = [
      c.greeting.content,
      c.ending.content,
      ...c.program.items.map((i) => i.title),
      ...c.notices.items.flatMap((n) => [n.title, n.text]),
    ];
    for (const s of texts) expect(s).not.toMatch(/[가-힣]/);
  });
  it('테마 등록: 입력 탭과 장 순서·라벨', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'meetup', templateId: 'meetup-1', today });
    expect(sectionTabs(inv)).toEqual([
      'basic',
      'ceremony',
      'greeting',
      'program',
      'notices',
      'gallery',
      'guestbook',
      'rsvp',
      'ending',
    ]);
    expect(inv.order).toEqual(['ceremony', 'program', 'notices', 'gallery', 'guestbook', 'rsvp', 'account']);
    const def = themeDef('meetup');
    expect(def.sectionLabel('program')).toBe('일정표');
    expect(def.pageLabel('rsvp')).toBe('참석 여부');
    expect(def.sectionLabel('account')).toBe('회비 계좌');
    expect(def.optional.map((s) => s.key)).not.toContain('speakers');
  });
  it('기본 정보: 모임 이름 필수, 주최는 선택', () => {
    expect(validateMeetup('basic', base())).toEqual(['eventName']);
    const c = { ...base(), basic: { ...base().basic, eventName: '송년회' } };
    expect(validateMeetup('basic', c)).toEqual([]);
    expect(validateMeetup('basic', { ...c, basic: { ...c.basic, host: 'x'.repeat(21) } })).toEqual(['host']);
  });
  it('안내사항: 1~5개, 제목 필수', () => {
    const c = base();
    expect(validateMeetup('notices', c)).toEqual([]);
    expect(validateMeetup('notices', { ...c, notices: { items: [] } })).toEqual(['items']);
    const bad = { id: 'n', title: ' ', text: '내용' };
    expect(validateMeetup('notices', { ...c, notices: { items: [bad] } })).toEqual(['items']);
  });
  it('회비 계좌: 은행·번호·예금주 모두 필수, 금액은 선택', () => {
    const c = base();
    const acc = (v: Partial<MeetupContent['account']>) => ({ ...c, account: { ...c.account, ...v } });
    expect(validateMeetup('account', c)).toEqual(['bank', 'number', 'holder']);
    expect(validateMeetup('account', acc({ bank: '국민', number: '123', holder: '김모임' }))).toEqual([]);
    expect(validateMeetup('account', acc({ bank: '국민' }))).toEqual(['number', 'holder']);
  });
  it('일정표는 기업 프로그램과 같은 규칙, 참석 여부 마감일은 행사일 이전', () => {
    const c = base();
    expect(validateMeetup('program', c)).toEqual([]);
    expect(validateMeetup('program', { ...c, program: { items: [] } })).toEqual(['items']);
    expect(validateMeetup('rsvp', { ...c, rsvp: { deadline: '2099-01-01' } })).toEqual(['deadline']);
  });
});
