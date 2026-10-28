import { useLocale } from '../../../i18n';
import { defaultCorporateContent, DRESS_CODES, inviterLine, isEmail, isPhone, validateCorporate } from '../corporate';
import type { CorporateContent } from '../model';
import '../registerThemes';
import { createInvitation, sectionTabs, themeDef } from '../themes';

const today = new Date(2026, 9, 25);
const base = () => defaultCorporateContent(today);
const filledBasic = (c: CorporateContent): CorporateContent => ({
  ...c,
  basic: { ...c.basic, eventName: '파트너스 데이', host: '우주컴퍼니' },
});

describe('기업 행사', () => {
  afterEach(() => useLocale.setState({ locale: 'ko' }));

  it('기본값: 프로그램 예시 3개, 연사 없음, 마감 없음, 초청 인사 미리 채움', () => {
    const c = base();
    expect(c.theme).toBe('corporate');
    expect(c.program.items.map((i) => i.title)).toEqual(['등록', '개회사', '본 행사']);
    expect(c.speakers.items).toEqual([]);
    expect(c.rsvp.deadline).toBe('');
    expect(c.greeting.content.length).toBeGreaterThan(0);
    expect(c.ceremony.date).toBe('2026-11-01');
  });
  it('영어 사용자는 기본 문구·예시·드레스코드 칩이 영어', () => {
    useLocale.setState({ locale: 'en' });
    const c = base();
    for (const s of [c.greeting.content, c.ending.content, ...c.program.items.map((i) => i.title), ...DRESS_CODES()])
      expect(s).not.toMatch(/[가-힣]/);
  });
  it('테마 등록: 입력 탭과 장 순서', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today });
    expect(sectionTabs(inv)).toEqual([
      'basic',
      'ceremony',
      'greeting',
      'directions',
      'program',
      'rsvp',
      'contact',
      'ending',
    ]);
    expect(inv.order).toEqual(['ceremony', 'program', 'speakers', 'directions', 'rsvp', 'contact']);
    expect(themeDef('corporate').sectionLabel('ceremony')).toBe('행사 개요');
    expect(themeDef('corporate').pageLabel('greeting')).toBe('초청 인사');
    expect(themeDef('corporate').optional.map((s) => s.key)).not.toContain('guestbook');
  });
  it('기본 정보: 행사명·주최 필수, 초청인은 둘 다 넣거나 둘 다 비움', () => {
    expect(validateCorporate('basic', base())).toEqual(['eventName', 'host']);
    const c = filledBasic(base());
    expect(validateCorporate('basic', c)).toEqual([]);
    expect(validateCorporate('basic', { ...c, basic: { ...c.basic, inviterName: '김우주' } })).toEqual(['inviter']);
    expect(validateCorporate('basic', { ...c, basic: { ...c.basic, eventName: 'x'.repeat(31) } })).toEqual([
      'eventName',
    ]);
  });
  it('행사 개요: 공통 일시·장소 규칙 + 대상·드레스코드 길이', () => {
    const c = base();
    const ok = { ...c, ceremony: { ...c.ceremony, venue: '그랜드홀', address: '서울 강남구 테헤란로 521' } };
    expect(validateCorporate('ceremony', ok)).toEqual([]);
    expect(validateCorporate('ceremony', { ...ok, ceremony: { ...ok.ceremony, dressCode: 'x'.repeat(21) } })).toEqual([
      'dressCode',
    ]);
  });
  it('프로그램: 1~12개, 제목 필수, 시간은 HH:mm 또는 빈칸', () => {
    const c = base();
    expect(validateCorporate('program', c)).toEqual([]);
    expect(validateCorporate('program', { ...c, program: { items: [] } })).toEqual(['items']);
    const bad = { ...c.program.items[0], time: '25:00' };
    expect(validateCorporate('program', { ...c, program: { items: [bad] } })).toEqual(['items']);
    const noTime = { ...c.program.items[0], time: '' };
    expect(validateCorporate('program', { ...c, program: { items: [noTime] } })).toEqual([]);
  });
  it('연사: 1~6명, 이름 필수', () => {
    const c = base();
    expect(validateCorporate('speakers', c)).toEqual(['items']);
    const s = { id: 's1', photo: null, name: '박서연', title: '', line: '' };
    expect(validateCorporate('speakers', { ...c, speakers: { items: [s] } })).toEqual([]);
  });
  it('참석 신청: 마감일은 비우거나 행사일 이전', () => {
    const c = base();
    expect(validateCorporate('rsvp', c)).toEqual([]);
    expect(validateCorporate('rsvp', { ...c, rsvp: { deadline: '2026-10-30' } })).toEqual([]);
    expect(validateCorporate('rsvp', { ...c, rsvp: { deadline: '2026-11-02' } })).toEqual(['deadline']);
  });
  it('문의처: 이름 필수, 전화나 메일 하나 이상, 형식 검사', () => {
    const c = base();
    const contact = (v: Partial<CorporateContent['contact']>) => ({
      ...c,
      contact: { ...c.contact, name: '사무국', ...v },
    });
    expect(validateCorporate('contact', contact({}))).toEqual(['reach']);
    expect(validateCorporate('contact', contact({ phone: '02-123-4567' }))).toEqual([]);
    expect(validateCorporate('contact', contact({ phone: '01012345678' }))).toEqual([]);
    expect(validateCorporate('contact', contact({ phone: '123' }))).toEqual(['phone']);
    expect(validateCorporate('contact', contact({ email: 'event@wuzu' }))).toEqual(['email']);
    expect(validateCorporate('contact', contact({ email: 'event@wuzu.kr' }))).toEqual([]);
  });
  it('형식 함수와 초청인 줄', () => {
    expect(isPhone('010-1234-5678')).toBe(true);
    expect(isPhone('+82 10 1234 5678')).toBe(false);
    expect(isEmail('a@b.co')).toBe(true);
    expect(inviterLine({ ...base().basic, inviterTitle: '대표이사', inviterName: '김우주' })).toBe('대표이사 김우주');
    expect(inviterLine(base().basic)).toBe('');
  });
});
