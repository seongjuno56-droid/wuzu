/**
 * 기업 행사 초대장 — 기본값·검사·테마 정의
 * (설계: docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md 4장)
 */
import { currentLocale } from '../../i18n';
import { newItemId } from './editor/listOps';
import {
  CorporateBasic,
  CorporateContent,
  defaultContent,
  isDateString,
  PAGE_LABEL,
  PageKey,
  ProgramItem,
  SECTION_LABEL,
  SectionKey,
  validateSection,
} from './model';
import { registerTheme, ThemeDef } from './themes';

export const CORP_LIMITS = {
  eventName: 30,
  host: 20,
  inviterName: 10,
  inviterTitle: 15,
  audience: 50,
  dressCode: 20,
  program: 12,
  programTitle: 30,
  programDetail: 50,
  speakers: 6,
  speakerName: 10,
  speakerTitle: 20,
  speakerLine: 50,
  directions: 200,
  contactName: 10,
} as const;

const isEn = () => currentLocale() === 'en';

// 사용자가 고치는 기본 문구 — 만들 때 사용자 언어로 넣는다 (하객 화면에서 raw 로 그림)
const KO_GREETING =
  /* i18n-ignore */
  '귀한 걸음으로 자리를 빛내 주시면\n더없는 영광이겠습니다.\n\n바쁘시더라도 참석하시어\n함께해 주시기 바랍니다.';
const EN_GREETING =
  'It would be our honor\nto have you join us.\n\nWe sincerely hope you can attend\nand share this occasion with us.';
const KO_ENDING = /* i18n-ignore */ '함께해 주셔서 감사합니다.';
const EN_ENDING = 'Thank you for joining us.';

export const defaultCorporateGreeting = () => (isEn() ? EN_GREETING : KO_GREETING);
export const defaultCorporateEnding = () => (isEn() ? EN_ENDING : KO_ENDING);

/** 드레스코드 칩 — 누르면 이 값이 입력칸에 들어간다 */
export const DRESS_CODES = () =>
  isEn()
    ? ['Casual', 'Business casual', 'Formal']
    : [/* i18n-ignore */ '자유 복장', /* i18n-ignore */ '비즈니스 캐주얼', /* i18n-ignore */ '정장'];

const programSeed = (): ProgramItem[] =>
  (isEn()
    ? [
        ['14:00', 'Registration'],
        ['14:30', 'Opening remarks'],
        ['15:00', 'Main session'],
      ]
    : [
        ['14:00', /* i18n-ignore */ '등록'],
        ['14:30', /* i18n-ignore */ '개회사'],
        ['15:00', /* i18n-ignore */ '본 행사'],
      ]
  ).map(([time, title]) => ({ id: newItemId(), time, title, detail: '' }));

export function defaultCorporateContent(today: Date = new Date()): CorporateContent {
  const w = defaultContent(today);
  return {
    theme: 'corporate',
    basic: { eventName: '', host: '', logo: null, inviterTitle: '', inviterName: '' },
    ceremony: { ...w.ceremony, time: '14:00', audience: '', dressCode: '' },
    greeting: { content: defaultCorporateGreeting(), photo: null, appendNames: true },
    program: { items: programSeed() },
    speakers: { items: [] },
    directions: { parking: '', transit: '' },
    rsvp: { deadline: '' },
    contact: { name: '', phone: '', email: '' },
    ending: { ...w.ending, content: defaultCorporateEnding() },
    bgm: w.bgm,
  };
}

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;

/** 국내 전화: 0으로 시작, 하이픈 있어도 없어도 (02-123-4567, 010-1234-5678, 01012345678) */
export const isPhone = (s: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(s.trim());
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** '대표이사 김우주' — 초청인을 안 넣었으면 '' */
export const inviterLine = (b: CorporateBasic) =>
  [b.inviterTitle.trim(), b.inviterName.trim()].filter(Boolean).join(' ');

export function validateCorporate(key: SectionKey, c: CorporateContent): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);
  switch (key) {
    case 'basic': {
      const b = c.basic;
      check(filled(b.eventName) && within(b.eventName, CORP_LIMITS.eventName), 'eventName');
      check(filled(b.host) && within(b.host, CORP_LIMITS.host), 'host');
      check(
        filled(b.inviterName) === filled(b.inviterTitle) &&
          within(b.inviterName, CORP_LIMITS.inviterName) &&
          within(b.inviterTitle, CORP_LIMITS.inviterTitle),
        'inviter',
      );
      return errors;
    }
    case 'ceremony': {
      const base = validateSection('ceremony', { ...defaultContent(), ceremony: c.ceremony });
      check(within(c.ceremony.audience, CORP_LIMITS.audience), 'audience');
      check(within(c.ceremony.dressCode, CORP_LIMITS.dressCode), 'dressCode');
      return [...base, ...errors];
    }
    case 'program': {
      const items = c.program.items;
      check(
        items.length >= 1 &&
          items.length <= CORP_LIMITS.program &&
          items.every(
            (i) =>
              filled(i.title) &&
              within(i.title, CORP_LIMITS.programTitle) &&
              within(i.detail, CORP_LIMITS.programDetail) &&
              (i.time === '' || isTime(i.time)),
          ),
        'items',
      );
      return errors;
    }
    case 'speakers': {
      const items = c.speakers.items;
      check(
        items.length >= 1 &&
          items.length <= CORP_LIMITS.speakers &&
          items.every(
            (s) =>
              filled(s.name) &&
              within(s.name, CORP_LIMITS.speakerName) &&
              within(s.title, CORP_LIMITS.speakerTitle) &&
              within(s.line, CORP_LIMITS.speakerLine),
          ),
        'items',
      );
      return errors;
    }
    case 'directions':
      check(within(c.directions.parking, CORP_LIMITS.directions), 'parking');
      check(within(c.directions.transit, CORP_LIMITS.directions), 'transit');
      return errors;
    case 'rsvp': {
      const d = c.rsvp.deadline;
      check(d === '' || (isDateString(d) && d <= c.ceremony.date), 'deadline');
      return errors;
    }
    case 'contact': {
      const k = c.contact;
      check(filled(k.name) && within(k.name, CORP_LIMITS.contactName), 'name');
      if (!filled(k.phone) && !filled(k.email)) errors.push('reach');
      if (filled(k.phone)) check(isPhone(k.phone), 'phone');
      if (filled(k.email)) check(isEmail(k.email), 'email');
      return errors;
    }
    default:
      // 초청 인사·엔딩·BGM 은 결혼식과 같은 규칙
      return validateSection(key, {
        ...defaultContent(),
        ceremony: c.ceremony,
        greeting: c.greeting,
        ending: c.ending,
        bgm: c.bgm,
      });
  }
}

const CORP_SECTION_LABEL: Partial<Record<SectionKey, string>> = { ceremony: '행사 개요', greeting: '초청 인사' };
const CORP_PAGE_LABEL: Partial<Record<PageKey, string>> = { ceremony: '행사 개요', greeting: '초청 인사' };

export const corporateTheme: ThemeDef = {
  id: 'corporate',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '행사명, 주최, 초청인 정보를 입력합니다.' },
    { key: 'ceremony', title: '행사 개요', body: '행사 일시와 장소, 대상, 드레스코드를 입력합니다.' },
    { key: 'greeting', title: '초청 인사', body: '초대하는 분께 드릴 인사말을 입력합니다.' },
    { key: 'directions', title: '오시는 길', body: '주차와 대중교통 안내를 입력합니다.' },
  ],
  optional: [
    { key: 'program', title: '프로그램', body: '행사 시간표를 보여줍니다.' },
    { key: 'speakers', title: '연사 소개', body: '연사 사진과 소개를 보여줍니다.' },
    { key: 'rsvp', title: '참석 신청', body: '참석 신청을 받고 명단을 관리합니다.' },
    { key: 'contact', title: '문의처', body: '담당자 연락처를 안내합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: { program: true, speakers: false, rsvp: true, contact: true, ending: true, bgm: false },
  defaultOrder: ['ceremony', 'program', 'speakers', 'directions', 'rsvp', 'contact'],
  createContent: defaultCorporateContent,
  defaultEnding: defaultCorporateEnding,
  validate: (key, c) => validateCorporate(key, c as CorporateContent),
  sectionLabel: (k) => CORP_SECTION_LABEL[k] ?? SECTION_LABEL[k],
  pageLabel: (p) => CORP_PAGE_LABEL[p] ?? PAGE_LABEL[p],
};

registerTheme(corporateTheme);
