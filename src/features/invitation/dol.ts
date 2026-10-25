/**
 * 돌잔치 초대장 — 기본값·검사·성장 이야기 미리 채우기·테마 정의
 * (설계: docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md 3장)
 */
import { newItemId } from './editor/listOps';
import { currentLocale } from '../../i18n';
import {
  BankAccount,
  defaultContent,
  DolBasic,
  DolContent,
  Guardian,
  LIMITS,
  MONTHS_EN,
  PAGE_LABEL,
  PageKey,
  parseDate,
  SECTION_LABEL,
  SectionKey,
  TimelineItem,
  toDateString,
  validateSection,
} from './model';
import { registerTheme, ThemeDef } from './themes';

export const DOL_LIMITS = {
  name: 10,
  relation: 10,
  guardians: 4,
  hashtags: 5,
  hashtag: 10,
  intro: 300,
  timeline: 6,
  itemTitle: 20,
  itemText: 60,
} as const;

// 아래 기본 문구·예시는 사용자가 고치는 내용이라 번역하지 않는다 (하객 화면에서 raw 로 그림)
export const DEFAULT_DOL_GREETING =
  /* i18n-ignore */
  '사랑스러운 우리 아이가\n세상에 태어난 지 벌써 일 년이 되었습니다.\n\n첫 걸음마, 첫 미소, 첫 옹알이…\n소중한 순간들을 함께해 주신 분들께\n감사의 마음을 전하고자 합니다.\n\n아이의 첫 번째 생일을\n함께 축하해 주세요.';
export const DEFAULT_DOL_ACCOUNT_MESSAGE =
  /* i18n-ignore */
  '참석이 어려우신 분들을 위해\n계좌번호를 안내해 드립니다.\n너그러운 마음으로 양해 부탁드립니다.';
export const DEFAULT_DOL_ENDING = /* i18n-ignore */ '와 주셔서 감사합니다.\n건강하고 바르게 키우겠습니다.';

// 영어 사용자 기본 문구
const EN_DOL_GREETING =
  "Our little one has already\nspent a whole year with us.\n\nFirst steps, first smiles, first babbles…\nWe would like to thank everyone\nwho shared these precious moments.\n\nPlease join us in celebrating\nour baby's very first birthday.";
const EN_DOL_ACCOUNT_MESSAGE =
  'For those who are unable to attend,\nwe have shared our account details below.\nThank you for your understanding.';
const EN_DOL_ENDING = 'Thank you for coming.\nWe will raise our little one with love.';

const guardian = (relation: string): Guardian => ({ id: newItemId(), relation, name: '' });

/** 사용자 언어에 맞는 돌잔치 엔딩 기본 문구 */
export const defaultDolEnding = () => (isEn() ? EN_DOL_ENDING : DEFAULT_DOL_ENDING);

export function defaultDolContent(today: Date = new Date()): DolContent {
  const w = defaultContent(today);
  return {
    theme: 'dol',
    basic: {
      childName: '',
      nickname: '',
      birthDate: '',
      photo: null,
      guardians: isEn()
        ? [guardian('Dad'), guardian('Mom')]
        : [guardian(/* i18n-ignore */ '아빠'), guardian(/* i18n-ignore */ '엄마')],
    },
    ceremony: { ...w.ceremony, time: '12:00' },
    greeting: { content: isEn() ? EN_DOL_GREETING : DEFAULT_DOL_GREETING, photo: null, appendNames: true },
    profile: { photo: null, intro: '', hashtags: [] },
    timeline: { items: [] },
    account: { message: isEn() ? EN_DOL_ACCOUNT_MESSAGE : DEFAULT_DOL_ACCOUNT_MESSAGE, accounts: {} },
    gallery: w.gallery,
    guestbook: w.guestbook,
    ending: { ...w.ending, content: defaultDolEnding() },
    bgm: w.bgm,
  };
}

/** 부르는 이름: 직접 넣었으면 그것, 아니면 성 뺀 이름(3자 이상일 때) */
export function nicknameOf(b: DolBasic): string {
  if (b.nickname.trim()) return b.nickname.trim();
  const n = b.childName.trim();
  return n.length >= 3 ? n.slice(1) : n;
}

/** '이윤종 · 이다영' — 이름을 넣은 보호자만 */
export const guardianNames = (b: DolBasic) =>
  b.guardians
    .map((g) => g.name.trim())
    .filter(Boolean)
    .join(' · ');

/** 받침이 있으면 '시안이의', 없으면 '하나의' */
export function withSubjectSuffix(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const hangul = last >= 0xac00 && last <= 0xd7a3;
  return hangul && (last - 0xac00) % 28 !== 0 ? /* i18n-ignore */ `${name}이의` : /* i18n-ignore */ `${name}의`;
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  return toDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const SEEDS: {
  key: string;
  title: string;
  text: string;
  en: [string, string];
  date: (birth: string, event: string) => string;
}[] = [
  {
    key: 'born',
    en: ['Born', 'The day a tiny cry changed every day'],
    title: /* i18n-ignore */ '태어난 날',
    text: /* i18n-ignore */ '작은 울음으로 모든 하루를 바꾼 날',
    date: (b) => b,
  },
  {
    key: '100',
    en: ['100 Days', 'Eat, sleep, smile, and suddenly 100 days'],
    title: /* i18n-ignore */ '100일',
    text: /* i18n-ignore */ '먹고 자고 웃다 보니 어느새 100일',
    date: (b) => addDays(b, 99),
  },
  {
    key: 'walk',
    en: ['First Steps', 'Every single day was a first'],
    title: /* i18n-ignore */ '첫 걸음마',
    text: /* i18n-ignore */ '하루하루가 처음이었어요',
    date: () => '',
  },
  {
    key: 'first',
    en: ['First Birthday', 'Finally, my very first birthday'],
    title: /* i18n-ignore */ '첫 생일',
    text: /* i18n-ignore */ '드디어 저의 첫 생일이에요',
    date: (b, e) => (isDate(e) ? e : addDays(b, 365)),
  },
];

/**
 * 성장 이야기 미리 채우기. 비어 있으면 4개를 만들고, 이미 있으면 사용자가 고치지 않은(edited=false)
 * 미리 채운 항목의 날짜만 새 태어난 날·행사일 기준으로 다시 맞춘다.
 */
export function seedTimeline(items: TimelineItem[], birthDate: string, eventDate: string): TimelineItem[] {
  if (!isDate(birthDate)) return items;
  if (!items.length) {
    return SEEDS.map((s) => ({
      id: `seed-${s.key}`,
      photo: null,
      date: s.date(birthDate, eventDate),
      title: isEn() ? s.en[0] : s.title,
      text: isEn() ? s.en[1] : s.text,
      edited: false,
    }));
  }
  return items.map((it) => {
    const seed = SEEDS.find((s) => it.id === `seed-${s.key}`);
    return seed && !it.edited ? { ...it, date: seed.date(birthDate, eventDate) } : it;
  });
}

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;
const fullAccount = (a?: BankAccount) => !!a && filled(a.bank) && filled(a.number);
const halfAccount = (a?: BankAccount) => !!a && filled(a.bank) !== filled(a.number);

export function validateDol(key: SectionKey, c: DolContent): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);
  switch (key) {
    case 'basic': {
      const b = c.basic;
      check(filled(b.childName) && within(b.childName, DOL_LIMITS.name), 'childName');
      check(within(b.nickname, DOL_LIMITS.name), 'nickname');
      check(isDate(b.birthDate) && (!isDate(c.ceremony.date) || b.birthDate <= c.ceremony.date), 'birthDate');
      check(!!b.photo, 'photo');
      check(
        b.guardians.length >= 1 &&
          b.guardians.length <= DOL_LIMITS.guardians &&
          b.guardians.every(
            (g) =>
              filled(g.relation) &&
              filled(g.name) &&
              within(g.relation, DOL_LIMITS.relation) &&
              within(g.name, DOL_LIMITS.name),
          ),
        'guardians',
      );
      break;
    }
    case 'profile': {
      const p = c.profile;
      check(p.intro.length <= DOL_LIMITS.intro, 'intro');
      check(
        p.hashtags.length <= DOL_LIMITS.hashtags && p.hashtags.every((h) => within(h, DOL_LIMITS.hashtag)),
        'hashtags',
      );
      break;
    }
    case 'timeline': {
      const items = c.timeline.items;
      check(
        items.length >= 1 &&
          items.length <= DOL_LIMITS.timeline &&
          items.every(
            (i) => filled(i.title) && within(i.title, DOL_LIMITS.itemTitle) && within(i.text, DOL_LIMITS.itemText),
          ),
        'items',
      );
      break;
    }
    case 'account': {
      // 지금 있는 보호자의 계좌만 본다 (지운 보호자의 계좌는 무시)
      const accounts = c.basic.guardians.map((g) => c.account.accounts[g.id]);
      check(c.account.message.length <= LIMITS.accountMessage, 'message');
      check(accounts.some(fullAccount) && !accounts.some(halfAccount), 'accounts');
      break;
    }
    default:
      // 일시·장소·인사말·갤러리·방명록·엔딩·BGM 은 결혼식과 같은 규칙
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
  return errors;
}

/** 지금 있는 보호자의 계좌만 남긴다 */
export const pruneAccounts = (c: DolContent): Record<string, BankAccount> =>
  Object.fromEntries(Object.entries(c.account.accounts).filter(([id]) => c.basic.guardians.some((g) => g.id === id)));

/** 태어난 날을 넣었는데 행사일보다 늦음 — 입력칸에 '태어난 날을 확인해 주세요.' */
export const birthDateProblem = (c: DolContent) =>
  isDate(c.basic.birthDate) && validateDol('basic', c).includes('birthDate');

// ── 하객 화면 문장 ──────────────────────────────────

const isEn = () => currentLocale() === 'en';

/** 2025년 4월 26일에 태어난 / Born on April 26, 2025 */
export function bornLine(b: DolBasic): string {
  if (!isDate(b.birthDate)) return '';
  const d = parseDate(b.birthDate);
  return isEn()
    ? `Born on ${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : /* i18n-ignore */ `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 태어난`;
}

/** 이윤종 · 이다영의 보물 (보호자 이름이 없으면 빈 줄) */
export function treasureLine(b: DolBasic): string {
  const names = guardianNames(b);
  if (!names) return '';
  return isEn() ? `Treasure of ${names}` : /* i18n-ignore */ `${names}의 보물`;
}

/** D-day 아래 줄: 시안이의 첫 생일까지 3일 */
export function ddayLine(c: DolContent, daysLeft: number): string {
  const nick = nicknameOf(c.basic) || (isEn() ? 'Baby' : '아이');
  return isEn()
    ? `${daysLeft} days until ${nick}'s first birthday`
    : /* i18n-ignore */ `${withSubjectSuffix(nick)} 첫 생일까지 ${daysLeft}일`;
}

const DOL_SECTION_LABEL: Partial<Record<SectionKey, string>> = { ceremony: '일시·장소', account: '마음 전하는 곳' };
const DOL_PAGE_LABEL: Partial<Record<PageKey, string>> = { ceremony: '일시·장소', account: '마음 전하는 곳' };

export const dolTheme: ThemeDef = {
  id: 'dol',
  fixed: [
    { key: 'basic', title: '기본 정보', body: '아이와 보호자 정보, 표지 사진을 입력합니다.' },
    { key: 'ceremony', title: '일시·장소', body: '돌잔치 날짜와 장소를 입력합니다.' },
    { key: 'greeting', title: '인사말', body: '하객분께 드릴 인사말을 입력합니다.' },
  ],
  optional: [
    { key: 'profile', title: '아이 프로필', body: '아이 사진과 소개, 해시태그를 보여줍니다.' },
    { key: 'timeline', title: '성장 이야기', body: '태어난 날부터 첫 생일까지의 이야기를 보여줍니다.' },
    { key: 'account', title: '마음 전하는 곳', body: '보호자 계좌를 안내합니다.' },
    { key: 'gallery', title: '갤러리', body: '아이 사진 갤러리를 제공합니다.' },
    { key: 'guestbook', title: '방명록', body: '방명록 기능을 제공합니다.' },
    { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
    { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
  ],
  defaultEnabled: {
    profile: true,
    timeline: true,
    account: true,
    gallery: true,
    guestbook: true,
    ending: true,
    bgm: false,
  },
  defaultOrder: ['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account'],
  createContent: defaultDolContent,
  validate: (key, c) => validateDol(key, c as DolContent),
  sectionLabel: (k) => DOL_SECTION_LABEL[k] ?? SECTION_LABEL[k],
  pageLabel: (p) => DOL_PAGE_LABEL[p] ?? PAGE_LABEL[p],
};

registerTheme(dolTheme);
