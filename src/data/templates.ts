import { Platform } from 'react-native';

import type { ThemeId } from './themes';

export const TEMPLATES_PER_THEME = 10;

export type TemplateFont = 'sans' | 'serif';

export interface TemplateStyle {
  bg: string;
  fg: string;
  sub: string;
  accent: string;
  font: TemplateFont;
  /** 표지 구성: 날짜 강조 / 이름 강조 / 프레임 */
  cover: 'date' | 'names' | 'frame';
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

const THEME_IDS: ThemeId[] = ['wedding', 'dol', 'meetup', 'corporate'];

const TEMPLATES: Record<ThemeId, InviteTemplate[]> = Object.fromEntries(
  THEME_IDS.map((themeId) => [
    themeId,
    STYLES.map((s, i) => ({ id: `${themeId}-${i + 1}`, themeId, name: s.name, style: s.style })),
  ]),
) as Record<ThemeId, InviteTemplate[]>;

export function getTemplates(themeId: string): InviteTemplate[] {
  return TEMPLATES[themeId as ThemeId] ?? [];
}

export function getTemplate(themeId: string, templateId: string): InviteTemplate | undefined {
  return getTemplates(themeId).find((t) => t.id === templateId);
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

export const templateFontFamily: Record<TemplateFont, string | undefined> = {
  sans: undefined, // 앱 기본 Pretendard
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
};
