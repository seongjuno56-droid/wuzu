/**
 * 모임 초대장 — 기본값·검사·테마 정의 (설계 5장)
 * 일정표는 기업 프로그램(program), 참석 여부는 기업 참석 신청(rsvp)과 같은 키·규칙을 쓴다.
 */
import { currentLocale } from '../../i18n';
import { validateCorporate } from './corporate';
import { newItemId } from './editor/listOps';
import {
  CorporateContent,
  defaultContent,
  MeetupContent,
  Notice,
  PAGE_LABEL,
  PageKey,
  ProgramItem,
  SECTION_LABEL,
  SectionKey,
  validateSection,
} from './model';
import { registerTheme, ThemeDef } from './themes';

export const MEETUP_LIMITS = {
  eventName: 30,
  host: 20,
  notices: 5,
  noticeTitle: 15,
  noticeText: 200,
  amount: 20,
  bank: 10,
  number: 20,
  holder: 10,
} as const;

const isEn = () => currentLocale() === 'en';

// 사용자가 고치는 기본 문구 — 만들 때 사용자 언어로
const KO_GREETING =
  /* i18n-ignore */ '오랜만에 다 같이 모여요!\n맛있는 음식과 즐거운 이야기 준비해 둘게요.\n\n바쁘더라도 꼭 와 주세요.';
const EN_GREETING = "Let's get together!\nGood food and great company are waiting.\n\nHope to see you there.";
const KO_ENDING = /* i18n-ignore */ '와 주셔서 고마워요.\n즐거운 시간 보내요!';
const EN_ENDING = 'Thanks for coming.\nLet’s have a great time!';

export const defaultMeetupEnding = () => (isEn() ? EN_ENDING : KO_ENDING);

const scheduleSeed = (): ProgramItem[] =>
  (isEn()
    ? [
        ['19:00', 'Gather & cheers'],
        ['19:30', 'Dinner'],
        ['21:00', 'Games & photos'],
      ]
    : [
        ['19:00', /* i18n-ignore */ '모여서 건배'],
        ['19:30', /* i18n-ignore */ '식사'],
        ['21:00', /* i18n-ignore */ '게임·사진'],
      ]
  ).map(([time, title]) => ({ id: newItemId(), time, title, detail: '' }));

const noticeSeed = (): Notice[] =>
  (isEn()
    ? [
        ['Fee', 'About $30 per person, paid on the day or by transfer.'],
        ['What to bring', 'Just yourself! A small gift is welcome.'],
      ]
    : [
        [/* i18n-ignore */ '회비', /* i18n-ignore */ '1인 3만원, 당일 또는 계좌로 보내 주세요.'],
        [/* i18n-ignore */ '준비물', /* i18n-ignore */ '몸만 오세요! 작은 선물은 환영해요.'],
      ]
  ).map(([title, text]) => ({ id: newItemId(), title, text }));

export function defaultMeetupContent(today: Date = new Date()): MeetupContent {
  const w = defaultContent(today);
  return {
    theme: 'meetup',
    basic: { eventName: '', host: '', photo: null },
    ceremony: { ...w.ceremony, time: '19:00' },
    greeting: { content: isEn() ? EN_GREETING : KO_GREETING, photo: null, appendNames: true },
    program: { items: scheduleSeed() },
    notices: { items: noticeSeed() },
    gallery: w.gallery,
    guestbook: w.guestbook,
    rsvp: { deadline: '' },
    account: { amount: '', bank: '', number: '', holder: '' },
    ending: { ...w.ending, content: defaultMeetupEnding() },
    bgm: w.bgm,
  };
}

/** D-day 아래 줄 — 숫자가 끼어 언어별로 만든다 */
export const meetupDdayLine = (daysLeft: number) =>
  isEn() ? `${daysLeft} days to go.` : /* i18n-ignore */ `모임까지 ${daysLeft}일 남았어요.`;

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;

export function validateMeetup(key: SectionKey, c: MeetupContent): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);
  switch (key) {
    case 'basic':
      check(filled(c.basic.eventName) && within(c.basic.eventName, MEETUP_LIMITS.eventName), 'eventName');
      check(within(c.basic.host, MEETUP_LIMITS.host), 'host');
      return errors;
    case 'notices': {
      const items = c.notices.items;
      check(
        items.length >= 1 &&
          items.length <= MEETUP_LIMITS.notices &&
          items.every(
            (n) =>
              filled(n.title) && within(n.title, MEETUP_LIMITS.noticeTitle) && within(n.text, MEETUP_LIMITS.noticeText),
          ),
        'items',
      );
      return errors;
    }
    case 'account': {
      const a = c.account;
      check(within(a.amount, MEETUP_LIMITS.amount), 'amount');
      check(filled(a.bank) && within(a.bank, MEETUP_LIMITS.bank), 'bank');
      check(filled(a.number) && within(a.number, MEETUP_LIMITS.number), 'number');
      check(filled(a.holder) && within(a.holder, MEETUP_LIMITS.holder), 'holder');
      return errors;
    }
    case 'program':
    case 'rsvp':
      // 일정표·참석 여부는 기업과 같은 규칙
      return validateCorporate(key, { program: c.program, rsvp: c.rsvp, ceremony: c.ceremony } as CorporateContent);
    default:
      // 일시·장소·초대 문구·갤러리·방명록·엔딩·BGM 은 결혼식과 같은 규칙
      return validateSection(key, {
        ...defaultContent(),
        ceremony: c.ceremony,
        greeting: c.greeting,
        gallery: c.gallery,
        guestbook: c.guestbook,
        ending: c.ending,
        bgm: c.bgm,
      });
  }
}

const LABEL: Partial<Record<SectionKey & PageKey, string>> = {
  ceremony: '일시·장소',
  greeting: '초대 문구',
  program: '일정표',
  rsvp: '참석 여부',
  account: '회비 계좌',
};

export const meetupTheme: ThemeDef = {
  id: 'meetup',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '모임 이름과 주최, 대표 사진을 입력합니다.' },
    { key: 'ceremony', title: '일시·장소', body: '모임 날짜와 장소를 입력합니다.' },
    { key: 'greeting', title: '초대 문구', body: '초대하는 말을 입력합니다.' },
  ],
  optional: [
    { key: 'program', title: '일정표', body: '모임 시간표를 보여줍니다.' },
    { key: 'notices', title: '안내사항', body: '회비·준비물 같은 안내를 카드로 보여줍니다.' },
    { key: 'gallery', title: '갤러리', body: '사진 갤러리를 제공합니다.' },
    { key: 'guestbook', title: '방명록', body: '방명록 기능을 제공합니다.' },
    { key: 'rsvp', title: '참석 여부', body: '참석 여부와 동반 인원을 받습니다.' },
    { key: 'account', title: '회비 계좌', body: '회비 금액과 계좌를 안내합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: {
    program: true,
    notices: true,
    gallery: true,
    guestbook: true,
    rsvp: true,
    account: false,
    ending: true,
    bgm: false,
  },
  defaultOrder: ['ceremony', 'program', 'notices', 'gallery', 'guestbook', 'rsvp', 'account'],
  createContent: defaultMeetupContent,
  defaultEnding: defaultMeetupEnding,
  validate: (key, c) => validateMeetup(key, c as MeetupContent),
  sectionLabel: (k) => LABEL[k as SectionKey & PageKey] ?? SECTION_LABEL[k],
  pageLabel: (p) => LABEL[p as SectionKey & PageKey] ?? PAGE_LABEL[p],
};

registerTheme(meetupTheme);
