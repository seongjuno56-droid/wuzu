import { fonts } from '../theme';
import type { ThemeId } from './themes';

export const TEMPLATES_PER_THEME = 10;

export type TemplateFont = 'sans' | 'serif' | 'round';

export interface TemplateStyle {
  bg: string;
  fg: string;
  sub: string;
  accent: string;
  font: TemplateFont;
  /** 표지 구성: 날짜 강조 / 이름 강조 / 프레임 */
  cover: 'date' | 'names' | 'frame';
  /** 돌잔치 표지 사진 틀 */
  frame?: 'arch' | 'circle' | 'oval' | 'rounded' | 'cloud';
  /** 돌잔치 표지 반짝이 */
  sparkle?: 'star' | 'heart' | 'dot' | 'none';
}

export interface InviteTemplate {
  id: string;
  themeId: ThemeId;
  name: string;
  style: TemplateStyle;
}

/** 템플릿 미리보기에 채워 넣는 예시 문구 */
export interface SampleContent {
  dateLabel: string;
  weekday: string;
  hosts: string;
  datetime: string;
  greetingTitle: string;
  greeting: string;
  family?: string[];
  infoTitle: string;
  infoLines: string[];
}

const STYLES: { name: string; style: TemplateStyle }[] = [
  { name: '클래식 아이보리', style: { bg: '#FBF8F2', fg: '#2B2A26', sub: '#7A746A', accent: '#B08D57', font: 'serif', cover: 'date' } },
  { name: '포레스트', style: { bg: '#1F3D30', fg: '#F4EFE4', sub: '#C9D3C8', accent: '#D8B878', font: 'serif', cover: 'names' } },
  { name: '미니멀 화이트', style: { bg: '#FFFFFF', fg: '#111111', sub: '#777777', accent: '#111111', font: 'sans', cover: 'date' } },
  { name: '블러쉬', style: { bg: '#F8E8E6', fg: '#4A2B2E', sub: '#8E6A6C', accent: '#C27C80', font: 'serif', cover: 'frame' } },
  { name: '미드나잇', style: { bg: '#1C2233', fg: '#F1F1F4', sub: '#A9AFC2', accent: '#C7A65A', font: 'sans', cover: 'names' } },
  { name: '세이지', style: { bg: '#E7EDE4', fg: '#2E3B2C', sub: '#6B7A67', accent: '#5E7D5A', font: 'sans', cover: 'frame' } },
  { name: '라벤더', style: { bg: '#EEEAF6', fg: '#322B45', sub: '#7A7290', accent: '#8B79B8', font: 'serif', cover: 'date' } },
  { name: '테라코타', style: { bg: '#F3E3D6', fg: '#4B2E21', sub: '#8F6B57', accent: '#C0673F', font: 'sans', cover: 'names' } },
  { name: '스카이', style: { bg: '#E6F0F7', fg: '#1F3446', sub: '#647B8E', accent: '#3E7CB1', font: 'sans', cover: 'frame' } },
  { name: '샴페인', style: { bg: '#F5EEDC', fg: '#3A3324', sub: '#8A7F63', accent: '#A88B4A', font: 'serif', cover: 'date' } },
];

/** 배경색 고르기: 템플릿 10종의 색 조합 (STYLES 와 같은 순서). 글자·포인트 색이 함께 바뀌어 어떤 배경에서도 읽힌다 */
export interface Palette {
  id: string;
  name: string;
  bg: string;
  fg: string;
  sub: string;
  accent: string;
}
const PALETTE_NAMES: [string, string][] = [
  ['ivory', '아이보리'],
  ['forest', '포레스트'],
  ['white', '화이트'],
  ['blush', '블러쉬'],
  ['midnight', '미드나잇'],
  ['sage', '세이지'],
  ['lavender', '라벤더'],
  ['terracotta', '테라코타'],
  ['sky', '스카이'],
  ['champagne', '샴페인'],
];
export const PALETTES: Palette[] = STYLES.map(({ style }, i) => ({
  id: PALETTE_NAMES[i][0],
  name: PALETTE_NAMES[i][1],
  bg: style.bg,
  fg: style.fg,
  sub: style.sub,
  accent: style.accent,
}));

/** 돌잔치 전용 10종 — 파스텔·둥근 서체 (설계 3장) */
const DOL_STYLES: { name: string; style: TemplateStyle }[] = [
  { name: '피치', style: { bg: '#FFF4EE', fg: '#4A2F2A', sub: '#9A7468', accent: '#F08A6C', font: 'round', cover: 'date', frame: 'arch', sparkle: 'star' } },
  { name: '민트', style: { bg: '#EEF8F3', fg: '#23443A', sub: '#6E8F84', accent: '#4FB08C', font: 'round', cover: 'date', frame: 'circle', sparkle: 'dot' } },
  { name: '레몬', style: { bg: '#FFFBE6', fg: '#4A4220', sub: '#8F8457', accent: '#E8B931', font: 'round', cover: 'date', frame: 'rounded', sparkle: 'star' } },
  { name: '하늘', style: { bg: '#EEF6FD', fg: '#213A52', sub: '#6D869C', accent: '#5B9BD9', font: 'round', cover: 'date', frame: 'cloud', sparkle: 'dot' } },
  { name: '라일락', style: { bg: '#F5F0FB', fg: '#3A2E4D', sub: '#857A98', accent: '#A487D4', font: 'round', cover: 'date', frame: 'oval', sparkle: 'heart' } },
  { name: '코랄', style: { bg: '#FFF1F0', fg: '#4D2A28', sub: '#9C716E', accent: '#EE6F67', font: 'round', cover: 'date', frame: 'arch', sparkle: 'heart' } },
  { name: '크림', style: { bg: '#FBF6EC', fg: '#43392B', sub: '#8E8270', accent: '#C8A06A', font: 'round', cover: 'date', frame: 'rounded', sparkle: 'none' } },
  { name: '새싹', style: { bg: '#F2F8EA', fg: '#2F4021', sub: '#7A8B6B', accent: '#86B556', font: 'round', cover: 'date', frame: 'circle', sparkle: 'star' } },
  { name: '로즈', style: { bg: '#FDF0F4', fg: '#4B2634', sub: '#977383', accent: '#E07A9C', font: 'round', cover: 'date', frame: 'oval', sparkle: 'heart' } },
  { name: '구름', style: { bg: '#F4F6FA', fg: '#2C3446', sub: '#7B8396', accent: '#8C9CC4', font: 'round', cover: 'date', frame: 'cloud', sparkle: 'star' } },
];
const DOL_PALETTE_IDS = ['peach', 'mint', 'lemon', 'skyblue', 'lilac', 'coral', 'cream', 'leaf', 'rose', 'cloud'];
/** 돌잔치 [색상] 칩의 10색 */
export const DOL_PALETTES: Palette[] = DOL_STYLES.map(({ name, style }, i) => ({
  id: DOL_PALETTE_IDS[i],
  name,
  bg: style.bg,
  fg: style.fg,
  sub: style.sub,
  accent: style.accent,
}));
/** 테마별 색 조합 */
export const palettesFor = (themeId: string): Palette[] => (themeId === 'dol' ? DOL_PALETTES : PALETTES);

const THEME_IDS: ThemeId[] = ['wedding', 'dol', 'meetup', 'corporate'];

const TEMPLATES: Record<ThemeId, InviteTemplate[]> = Object.fromEntries(
  THEME_IDS.map((themeId) => [
    themeId,
    (themeId === 'dol' ? DOL_STYLES : STYLES).map((s, i) => ({
      id: `${themeId}-${i + 1}`,
      themeId,
      name: s.name,
      style: s.style,
    })),
  ]),
) as Record<ThemeId, InviteTemplate[]>;

export function getTemplates(themeId: string): InviteTemplate[] {
  return TEMPLATES[themeId as ThemeId] ?? [];
}

export function getTemplate(themeId: string, templateId: string): InviteTemplate | undefined {
  return getTemplates(themeId).find((t) => t.id === templateId);
}

/** 템플릿을 찾지 못했을 때 쓰는 기본 룩 */
export const FALLBACK_STYLE: TemplateStyle = {
  bg: '#FFFFFF',
  fg: '#222222',
  sub: '#777777',
  accent: '#D9607E',
  font: 'serif',
  cover: 'date',
};

/** 템플릿 룩. paletteId 를 주면 색만 그 조합으로 (서체·표지 배치는 템플릿 그대로) */
export function styleFor(themeId: string, templateId: string, paletteId?: string | null): TemplateStyle {
  const base = getTemplate(themeId, templateId)?.style ?? FALLBACK_STYLE;
  const p = paletteId ? palettesFor(themeId).find((x) => x.id === paletteId) : undefined;
  return p ? { ...base, bg: p.bg, fg: p.fg, sub: p.sub, accent: p.accent } : base;
}

/** 템플릿이 원래 쓰는 색 조합 */
export function paletteOfTemplate(themeId: string, templateId: string): string | undefined {
  const i = getTemplates(themeId).findIndex((t) => t.id === templateId);
  const list = palettesFor(themeId);
  return i >= 0 ? list[i % list.length].id : undefined;
}

export const SAMPLE_CONTENT: Record<ThemeId, SampleContent> = {
  wedding: {
    dateLabel: '2026 / 12 / 31',
    weekday: 'Thursday',
    hosts: '홍길동 ♥ 김영희',
    datetime: '2026년 12월 31일 목요일, 오후 2시',
    greetingTitle: '소중한 분들을 초대합니다.',
    greeting:
      '작은 인연이 어느덧 사랑의 결실을 이루어\n평생 함께하겠다는 서약을 여러분 앞에\n맹세하고자 합니다.\n\n행복을 맹세하는 이 날, 귀한 발걸음해주셔서\n축복해주셨으면 합니다.',
    family: ['홍철수 · 이순자의 아들 홍길동', '김민수 · 박지영의 딸 김영희'],
    infoTitle: '예식 정보',
    infoLines: ['2026년 12월 31일 목요일 오후 2시', '더채플 웨딩홀 3층 그랜드볼룸', '서울특별시 강남구 테헤란로 123'],
  },
  dol: {
    dateLabel: '2026 / 11 / 21',
    weekday: 'Saturday',
    hosts: '우리 아기 서윤이의 첫 생일',
    datetime: '2026년 11월 21일 토요일, 낮 12시',
    greetingTitle: '첫 돌에 초대합니다.',
    greeting:
      '사랑으로 키운 1년, 건강하게 자라준\n서윤이의 첫 생일을 맞이하여\n소중한 분들을 모시고 작은 잔치를 열고자 합니다.\n\n오셔서 축복해 주시면 감사하겠습니다.',
    family: ['아빠 이준호 · 엄마 박소연'],
    infoTitle: '돌잔치 정보',
    infoLines: ['2026년 11월 21일 토요일 낮 12시', '라온 한정식 2층 연회장', '경기도 성남시 분당구 판교로 45'],
  },
  meetup: {
    dateLabel: '2026 / 12 / 05',
    weekday: 'Saturday',
    hosts: '00학번 동기 송년 모임',
    datetime: '2026년 12월 5일 토요일, 저녁 7시',
    greetingTitle: '오랜만에 얼굴 한번 봐요!',
    greeting:
      '한 해를 마무리하며 반가운 얼굴들과\n따뜻한 시간을 보내고 싶어요.\n\n바쁘더라도 잠깐 들러서 함께 웃어요.',
    infoTitle: '모임 정보',
    infoLines: ['2026년 12월 5일 토요일 저녁 7시', '을지로 한옥 다이닝 별채', '회비 3만원 (현장 결제)'],
  },
  corporate: {
    dateLabel: '2026 / 12 / 18',
    weekday: 'Friday',
    hosts: '2026 우쥬 송년의 밤',
    datetime: '2026년 12월 18일 금요일, 오후 6시 30분',
    greetingTitle: '한 해 동안 고생 많으셨습니다.',
    greeting:
      '함께 달려온 2026년을 돌아보며\n감사의 마음을 나누는 자리를 마련했습니다.\n\n임직원 여러분의 많은 참석 부탁드립니다.',
    infoTitle: '행사 정보',
    infoLines: ['2026년 12월 18일 금요일 오후 6시 30분', '그랜드 호텔 B1 크리스탈홀', '드레스코드: 블랙 & 화이트'],
  },
};

/** 템플릿 서체: [본문, 강조] */
export const templateFontFamily: Record<TemplateFont, [string, string]> = {
  sans: [fonts.regular, fonts.semibold],
  serif: [fonts.serif, fonts.serifBold],
  round: [fonts.round, fonts.roundBold],
};
