/**
 * 결혼식 초대장 도메인 모델 — 타입, 기본값, 페이지 순서, 섹션별 유효성 검사
 * (설계: docs/superpowers/specs/2026-10-15-wedding-invitation-editor-design.md)
 */

import { currentLocale } from '../../i18n';
import type { SlideDesign, ViewMode } from '../canvas/types';

// ── 타입 ──────────────────────────────────────────────

/** 하단 탭바 / 바텀시트 단위 */
export type SectionKey =
  | 'basic'
  | 'ceremony'
  | 'greeting'
  | 'account'
  | 'gallery'
  | 'guestbook'
  | 'ending'
  | 'bgm'
  // 돌잔치 전용
  | 'profile'
  | 'timeline';
/** Step3 에서 켜고 끌 수 있는 항목 */
export type OptionalSection = 'account' | 'gallery' | 'guestbook' | 'ending' | 'bgm' | 'profile' | 'timeline';
/** 초대장 화면에 그려지는 페이지 */
export type PageKey =
  | 'cover'
  | 'greeting'
  | 'gallery'
  | 'ceremony'
  | 'guestbook'
  | 'account'
  | 'ending'
  | 'profile'
  | 'timeline';
/** Step4 에서 드래그로 순서를 바꿀 수 있는 페이지 */
export type ReorderablePage = 'gallery' | 'ceremony' | 'guestbook' | 'account' | 'profile' | 'timeline';

export type EnabledSections = Partial<Record<OptionalSection, boolean>>;

export interface Person {
  name: string;
  title: string;
  deceased: boolean;
}

export interface BasicInfo {
  groom: Person;
  groomFather: Person;
  groomMother: Person;
  bride: Person;
  brideFather: Person;
  brideMother: Person;
}

export interface CeremonyInfo {
  venue: string;
  addressMode: 'search' | 'manual';
  zonecode: string;
  address: string;
  addressDetail: string;
  hall: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mapMode: 'use' | 'none';
  mapImages: string[];
  showCalendar: boolean;
  showDday: boolean;
}

export interface GreetingInfo {
  content: string;
  photo: string | null;
  appendNames: boolean;
}

export interface BankAccount {
  bank: string;
  number: string;
}

export interface AccountInfo {
  message: string;
  groom: BankAccount;
  groomFather: BankAccount;
  groomMother: BankAccount;
  bride: BankAccount;
  brideFather: BankAccount;
  brideMother: BankAccount;
}

export interface GalleryInfo {
  style: 'swipe' | 'grid';
  columns: 2 | 3;
  collapse: boolean;
  photos: string[];
}

export interface GuestbookSettings {
  style: 1 | 2;
}

export interface EndingInfo {
  style: 1 | 2;
  content: string;
  photos: string[];
}

export interface BgmInfo {
  uri: string | null;
  fileName: string | null;
  muteColor: 'black' | 'white';
}

/** 결혼식 콘텐츠. 옛 저장본은 theme 필드가 없다 */
export interface WeddingContent {
  theme?: 'wedding';
  basic: BasicInfo;
  ceremony: CeremonyInfo;
  greeting: GreetingInfo;
  account: AccountInfo;
  gallery: GalleryInfo;
  guestbook: GuestbookSettings;
  ending: EndingInfo;
  bgm: BgmInfo;
}

// ── 돌잔치 (설계: docs/superpowers/specs/2026-10-22-dol-corporate-meetup-themes-design.md 3장) ──

export interface Guardian {
  id: string;
  /** 아빠·엄마·할머니 등 직접 입력 */
  relation: string;
  name: string;
}

export interface DolBasic {
  childName: string;
  /** 부르는 이름 (비우면 성 뺀 이름) */
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  /** 표지 사진 */
  photo: string | null;
  guardians: Guardian[];
}

export interface DolProfile {
  photo: string | null;
  intro: string;
  hashtags: string[];
}

export interface TimelineItem {
  id: string;
  photo: string | null;
  date: string; // YYYY-MM-DD 또는 
  title: string;
  text: string;
  /** 사용자가 고쳤는지 — 고친 항목은 미리 채우기가 덮어쓰지 않는다 */
  edited: boolean;
}

export interface DolTimeline {
  items: TimelineItem[];
}

export interface DolAccount {
  message: string;
  /** 보호자 id → 계좌 */
  accounts: Record<string, BankAccount>;
}

export interface DolContent {
  theme: 'dol';
  basic: DolBasic;
  ceremony: CeremonyInfo;
  greeting: GreetingInfo;
  profile: DolProfile;
  timeline: DolTimeline;
  account: DolAccount;
  gallery: GalleryInfo;
  guestbook: GuestbookSettings;
  ending: EndingInfo;
  bgm: BgmInfo;
}

export type InvitationContent = WeddingContent | DolContent;

export const isDol = (c: InvitationContent): c is DolContent => c.theme === 'dol';

/** 결혼식 전용 부품에서만 쓴다 — 돌잔치가 들어오면 화면 연결이 잘못된 것 */
export function asWedding(c: InvitationContent): WeddingContent {
  if (isDol(c)) throw new Error(/* i18n-ignore */ '결혼식 초대장이 아니에요');
  return c;
}

/** 저장 상태: 임시저장 / 최종저장. 화면 상태(작성중·비활성화·활성화·기한만료·사용불가)는 status.ts 에서 계산 */
export type InvitationStatus = 'draft' | 'final';

export interface Invitation {
  id: string;
  ownerId: string;
  themeId: string;
  templateId: string;
  name: string;
  /** 초대장No (11자리) */
  number: string;
  /** 활성화 시작·종료 시각 (ISO). 한 번도 활성화하지 않았으면 없음 */
  activatedAt?: string;
  expiresAt?: string;
  /** 관리자 제재 */
  banned?: boolean;
  /** 작성자가 방명록 관리를 마지막으로 확인한 시각 */
  guestbookSeenAt?: string;
  status: InvitationStatus;
  enabled: EnabledSections;
  order: ReorderablePage[];
  content: InvitationContent;
  /** 하객 보기 형태 (제작자가 고른다) */
  viewMode: ViewMode;
  /** 배경 색 조합 (data/templates PALETTES 의 id). 없으면 템플릿 색 */
  paletteId?: string | null;
  /** 슬라이드별 디자인. 없으면 형식(템플릿 배치) */
  design: Partial<Record<PageKey, SlideDesign>>;
  /** 바텀시트에서 ✓ 확인까지 마친 섹션 */
  completed: Partial<Record<SectionKey, boolean>>;
  createdAt: string;
  updatedAt: string;
}

// ── 상수 ──────────────────────────────────────────────

export const LIMITS = {
  personName: 10,
  venue: 20,
  address: 100,
  hall: 50,
  greeting: 300,
  accountMessage: 300,
  bank: 10,
  accountNumber: 20,
  ending: 300,
  galleryMin: 4,
  galleryMax: 12,
  endingPhotos: 3,
  mapImages: 3,
  invitationName: { min: 1, max: 30 },
  guestbook: { name: 10, passwordMin: 4, passwordMax: 20, content: 300 },
  bgmBytes: 5 * 1024 * 1024,
} as const;

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'ogg'];

export const SECTION_LABEL: Record<SectionKey, string> = {
  basic: '기본정보',
  ceremony: '예식정보',
  greeting: '인사말',
  account: '계좌번호',
  gallery: '갤러리',
  guestbook: '방명록',
  ending: '엔딩',
  bgm: 'BGM',
  profile: '아이 프로필',
  timeline: '성장 이야기',
};

export const PAGE_LABEL: Record<PageKey, string> = {
  cover: '표지',
  greeting: '인사말',
  gallery: '갤러리',
  ceremony: '예식 정보',
  guestbook: '방명록',
  account: '계좌번호',
  ending: '엔딩',
  profile: '아이 프로필',
  timeline: '성장 이야기',
};

export const DEFAULT_ORDER: ReorderablePage[] = ['gallery', 'ceremony', 'guestbook', 'account'];
export const DEFAULT_ENABLED: EnabledSections = { account: true, gallery: true, guestbook: true, ending: true, bgm: false };

/** [직접 꾸미기]를 열어 둔 페이지 (1차: 표지만) */
export const CANVAS_PAGES: PageKey[] = ['cover'];


export const DEFAULT_ACCOUNT_MESSAGE =
  '참석이 어려우신 분들을 위해\n계좌번호를 기재하였습니다.\n너그러운 마음으로 양해 부탁드립니다.';
export const DEFAULT_ENDING = '먼길 와주셔서 감사합니다.\n앞으로 오래오래 행복하게 잘 살겠습니다.';

// ── 기본값 ────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const person = (title = ''): Person => ({ name: '', title, deceased: false });
const account = (): BankAccount => ({ bank: '', number: '' });

export function defaultContent(today: Date = new Date()): WeddingContent {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return {
    // 신랑·신부 호칭만 미리 채운다. 부모님 호칭은 입력란 안내 문구로만 보여준다 (짝 검사 대상)
    basic: {
      groom: person('아들'),
      groomFather: person(),
      groomMother: person(),
      bride: person('딸'),
      brideFather: person(),
      brideMother: person(),
    },
    ceremony: {
      venue: '',
      addressMode: 'search',
      zonecode: '',
      address: '',
      addressDetail: '',
      hall: '',
      date: toDateString(date),
      time: '13:00',
      mapMode: 'use',
      mapImages: [],
      showCalendar: true,
      showDday: true,
    },
    greeting: {
      content: '',
      photo: null,
      appendNames: true,
    },
    account: {
      message: DEFAULT_ACCOUNT_MESSAGE,
      groom: account(),
      groomFather: account(),
      groomMother: account(),
      bride: account(),
      brideFather: account(),
      brideMother: account(),
    },
    gallery: { style: 'swipe', columns: 3, collapse: true, photos: [] },
    guestbook: { style: 1 },
    ending: { style: 1, content: DEFAULT_ENDING, photos: [] },
    bgm: { uri: null, fileName: null, muteColor: 'white' },
  };
}

/** 초대장No: 11자리 숫자 */
export const newInvitationNumber = (random: () => number = Math.random) =>
  String(Math.floor(1e10 + Math.min(random(), 0.9999999999) * 9e10));

/** 저장 종류 → 저장 상태: 임시저장은 언제나 작성중으로 내린다 (최종저장본을 고치다 임시저장해도 미완성 내용이 활성화되지 않게) */
export const savedStatus = (kind: 'draft' | 'final'): InvitationStatus => kind;

/** 예전 저장본 보정: 'active' → 'final', 번호가 없으면 생성. changed 면 저장해야 번호가 고정된다 */
export function normalizeInvitation(inv: Invitation): { invitation: Invitation; changed: boolean } {
  const raw = inv as Omit<Invitation, 'status' | 'number' | 'viewMode' | 'design'> &
    Partial<Pick<Invitation, 'viewMode' | 'design'>> & { status: string; number?: string };
  const status: InvitationStatus = raw.status === 'draft' ? 'draft' : 'final';
  const number = raw.number ?? newInvitationNumber();
  // 보기 형태·디자인이 없는 저장본은 스토리형·형식 표지로
  const viewMode = raw.viewMode ?? 'story';
  const design = raw.design ?? {};
  const changed = status !== raw.status || number !== raw.number || !raw.viewMode || !raw.design;
  return { invitation: changed ? { ...inv, status, number, viewMode, design } : inv, changed };
}

// ── 순서 / 탭 ─────────────────────────────────────────

/** 실제로 그려질 페이지 순서: 표지·인사말 고정 → 사용 중인 재정렬 페이지 → 엔딩 */
export function pageOrder(enabled: EnabledSections, order: ReorderablePage[]): PageKey[] {
  const middle = order.filter((p) => p === 'ceremony' || !!enabled[p]);
  return ['cover', 'greeting', ...middle, ...(enabled.ending ? (['ending'] as const) : [])];
}

// ── 유효성 검사 ───────────────────────────────────────

const filled = (s: string) => s.trim().length > 0;
const within = (s: string, max: number) => s.trim().length <= max;

/** 필수 인물: 이름·호칭 모두 1~10자 */
const requiredPerson = (p: Person) =>
  filled(p.name) && filled(p.title) && within(p.name, LIMITS.personName) && within(p.title, LIMITS.personName);
/** 선택 인물: 비워도 되지만 이름↔호칭 중 하나만 있으면 오류 */
const optionalPerson = (p: Person) =>
  filled(p.name) === filled(p.title) && within(p.name, LIMITS.personName) && within(p.title, LIMITS.personName);

const requiredAccount = (a: BankAccount) =>
  filled(a.bank) && filled(a.number) && within(a.bank, LIMITS.bank) && within(a.number, LIMITS.accountNumber);
const optionalAccount = (a: BankAccount) =>
  filled(a.bank) === filled(a.number) && within(a.bank, LIMITS.bank) && within(a.number, LIMITS.accountNumber);

/** 섹션의 오류 필드 목록 (빈 배열 = 통과) */
export function validateSection(key: SectionKey, content: InvitationContent): string[] {
  const c = asWedding(content);
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => !ok && errors.push(field);

  switch (key) {
    case 'basic': {
      const b = c.basic;
      check(requiredPerson(b.groom), 'groom');
      check(optionalPerson(b.groomFather), 'groomFather');
      check(optionalPerson(b.groomMother), 'groomMother');
      check(requiredPerson(b.bride), 'bride');
      check(optionalPerson(b.brideFather), 'brideFather');
      check(optionalPerson(b.brideMother), 'brideMother');
      break;
    }
    case 'ceremony': {
      const e = c.ceremony;
      check(filled(e.venue) && within(e.venue, LIMITS.venue), 'venue');
      check(filled(e.address) && within(e.address, LIMITS.address), 'address');
      check(within(e.addressDetail, LIMITS.address), 'addressDetail');
      check(within(e.hall, LIMITS.hall), 'hall');
      check(/^\d{4}-\d{2}-\d{2}$/.test(e.date), 'date');
      check(/^\d{2}:\d{2}$/.test(e.time), 'time');
      if (e.mapMode === 'use' && e.addressMode === 'manual') {
        check(e.mapImages.length >= 1 && e.mapImages.length <= LIMITS.mapImages, 'mapImages');
      }
      break;
    }
    case 'greeting':
      check(filled(c.greeting.content) && c.greeting.content.length <= LIMITS.greeting, 'content');
      break;
    case 'account': {
      const a = c.account;
      check(a.message.length <= LIMITS.accountMessage, 'message');
      check(requiredAccount(a.groom), 'groom');
      check(optionalAccount(a.groomFather), 'groomFather');
      check(optionalAccount(a.groomMother), 'groomMother');
      check(requiredAccount(a.bride), 'bride');
      check(optionalAccount(a.brideFather), 'brideFather');
      check(optionalAccount(a.brideMother), 'brideMother');
      break;
    }
    case 'gallery':
      check(
        c.gallery.photos.length >= LIMITS.galleryMin && c.gallery.photos.length <= LIMITS.galleryMax,
        'photos',
      );
      break;
    case 'guestbook':
      break;
    case 'ending':
      check(filled(c.ending.content) && c.ending.content.length <= LIMITS.ending, 'content');
      check(c.ending.photos.length <= LIMITS.endingPhotos, 'photos');
      break;
    case 'bgm':
      check(!!c.bgm.uri, 'file');
      break;
  }
  return errors;
}

export function isValidInvitationName(name: string): boolean {
  const len = name.trim().length;
  return len >= LIMITS.invitationName.min && len <= LIMITS.invitationName.max;
}

export function validateGuestbookEntry(e: { name: string; password: string; content: string }): string[] {
  const g = LIMITS.guestbook;
  const errors: string[] = [];
  if (!filled(e.name) || e.name.trim().length > g.name) errors.push('name');
  if (e.password.length < g.passwordMin || e.password.length > g.passwordMax) errors.push('password');
  if (!filled(e.content) || e.content.length > g.content) errors.push('content');
  return errors;
}

// ── 화면 계산 도우미 ──────────────────────────────────

/** 성을 뗀 이름 (3자 이상일 때만): 홍길동 → 길동 */
export function givenName(name: string): string {
  const n = name.trim();
  return n.length >= 3 ? n.slice(1) : n;
}

export interface DdayParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** 달력 기준 남은 날짜 수 (결혼식까지 N일) */
  daysLeft: number;
  past: boolean;
}

export function ddayParts(target: Date, now: Date = new Date()): DdayParts {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const sec = Math.floor(diff / 1000);
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
    daysLeft: Math.max(0, Math.round((dayStart(target) - dayStart(now)) / 86400000)),
    past: target.getTime() <= now.getTime(),
  };
}

/** 달력 행 (일요일 시작). 빈 칸은 null */
export function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// 화면에는 weekdayNames() 로 언어에 맞춰 낸다
export const WEEKDAYS_KO = /* i18n-ignore */ ['일', '월', '화', '수', '목', '금', '토'];
export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── 언어별 날짜 서식 (조각 번역 대신 — '일'·'월'이 요일로 번역되는 문제 방지) ──

const isEn = () => currentLocale() === 'en';

/** 달력 머리글 요일 (일요일 시작) */
export const weekdayNames = () => (isEn() ? WEEKDAYS_EN_SHORT : WEEKDAYS_KO);

/** 2026년 / 2026 */
/** 2025년 4월 26일 / Apr 26, 2025 (성장 이야기 날짜) */
export function formatShortDate(date: string): string {
  const d = parseDate(date);
  return isEn()
    ? `${MONTHS_EN[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
    : /* i18n-ignore */ `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export const formatYear = (year: number | string) => (isEn() ? `${year}` : /* i18n-ignore */ `${year}년`);

/** 2026년 5월 / May 2026 */
export const formatYearMonth = (year: number, month: number) =>
  isEn() ? `${MONTHS_EN[month - 1]} ${year}` : /* i18n-ignore */ `${year}년 ${month}월`;

/** D-Day: 3일 4시간 5분 6초 / 3d 4h 5m 6s */
export const formatCountdown = (d: { days: number; hours: number; minutes: number; seconds: number }) =>
  isEn()
    ? `${d.days}d ${d.hours}h ${d.minutes}m ${d.seconds}s`
    : /* i18n-ignore */ `${d.days}일 ${d.hours}시간 ${d.minutes}분 ${d.seconds}초`;

/** 목요일 오후 2시 / Thursday 2 PM */
export const formatWeekdayTime = (date: Date, time: string) =>
  isEn()
    ? `${WEEKDAYS_EN[date.getDay()]} ${formatKoreanTime(time)}`
    : /* i18n-ignore */ `${WEEKDAYS_KO[date.getDay()]}요일 ${formatKoreanTime(time)}`;

/** 2026년 12월 31일 목요일, 오후 2시 / Thursday, December 31, 2026, 2 PM */
export function formatDateTimeLine(date: Date, time: string): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return isEn()
    ? `${WEEKDAYS_EN[date.getDay()]}, ${MONTHS_EN[m - 1]} ${d}, ${y}, ${formatKoreanTime(time)}`
    : /* i18n-ignore */ `${y}년 ${m}월 ${d}일 ${WEEKDAYS_KO[date.getDay()]}요일, ${formatKoreanTime(time)}`;
}

/** 13:00 → 오후 1시, 14:30 → 오후 2시 30분 */
export function formatKoreanTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  // 영어: 2 PM / 2:30 PM
  if (currentLocale() === 'en') {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
  }
  const period = h < 12 ? '오전' : '오후';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return /* i18n-ignore */ `${period} ${hour}시${m ? ` ${m}분` : ''}`;
}

export function fileExtension(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

const IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png'];

/** jpg·jpeg·png 만 허용 (MIME 또는 파일 이름/경로의 확장자로 판단) */
export function checkImageFile(f: { mimeType?: string | null; fileName?: string | null; uri?: string }): boolean {
  if (f.mimeType) return IMAGE_MIME.includes(f.mimeType.toLowerCase());
  const ext = fileExtension(f.fileName ?? f.uri ?? '');
  return IMAGE_EXTENSIONS.includes(ext);
}

/** BGM: MP3·M4A·AAC·WAV·OGG, 5MB 이하 */
export function checkAudioFile(f: { name: string; size?: number | null }): 'ok' | 'extension' | 'size' {
  if (!AUDIO_EXTENSIONS.includes(fileExtension(f.name))) return 'extension';
  if ((f.size ?? 0) > LIMITS.bgmBytes) return 'size';
  return 'ok';
}
