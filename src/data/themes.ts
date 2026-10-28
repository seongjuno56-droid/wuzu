import type { Icon3DName } from '../components/brand/Icon3D';

export type ThemeId = 'wedding' | 'dol' | 'meetup' | 'corporate';

/** 여러 아이콘을 한 판에 배치할 때의 한 장. 크기·위치는 그림 판 크기 대비 비율(0~1) */
export interface ArtLayer {
  name: Icon3DName;
  size: number;
  x: number;
  y: number;
  rotate?: number;
}

export interface InviteTheme {
  id: ThemeId;
  label: string;
  title: string;
  description: string;
  tags: string[];
  /** 3D 일러스트: 아이콘 하나, 또는 뒤에서 앞 순서로 겹쳐 그릴 여러 장 */
  art: Icon3DName | ArtLayer[];
  tint: string;
  tintSoft: string;
}

export const THEMES: InviteTheme[] = [
  {
    id: 'wedding',
    label: '청첩장',
    title: '결혼식 청첩장',
    description: '두 사람의 시작을 알리는 한 장',
    tags: ['#결혼', '#우리행복', '#응원해주세요'],
    // 부케를 크게, 반지는 오른쪽 아래에 기울여 겹친다
    art: [
      { name: 'bouquet', size: 0.72, x: 0.05, y: 0.04 },
      { name: 'ring', size: 0.38, x: 0.56, y: 0.55, rotate: 14 },
    ],
    tint: '#D9607E',
    tintSoft: '#FCE9EE',
  },
  {
    id: 'dol',
    label: '돌잔치',
    title: '돌잔치 초대장',
    description: '아이의 첫 생일을 함께해요',
    tags: ['#장군감', '#첫돌', '#내딸내아들'],
    // 돌잡이 상: 청진기(뒤 가운데), 지폐(앞 왼쪽), 연필(앞 오른쪽)
    art: [
      { name: 'stethoscope', size: 0.5, x: 0.22, y: 0.04 },
      { name: 'money', size: 0.44, x: 0.07, y: 0.5, rotate: -12 },
      { name: 'pencil', size: 0.42, x: 0.53, y: 0.52 },
    ],
    tint: '#E0A21B',
    tintSoft: '#FFF4D9',
  },
  {
    id: 'meetup',
    label: '모임',
    title: '모임 초대장',
    description: '생일, 동창회, 집들이까지',
    tags: ['#생일도', '#동창회도', '#뭐든좋아'],
    art: 'cheers',
    tint: '#2E9A6E',
    tintSoft: '#E1F4EA',
  },
  {
    id: 'corporate',
    label: '기업 행사',
    title: '기업 행사 초대장',
    description: '송년회, 신년회, 세미나',
    tags: ['#송년회', '#신년회', '#유대감뿜뿜'],
    art: 'office',
    tint: '#6A5FD0',
    tintSoft: '#ECEBFB',
  },
];

/** 나의 초대장 카드의 종류 이름 — 결혼식은 지금처럼 '결혼식 초대장' */
export function invitationKind(themeId: string): string {
  if (themeId === 'wedding') return '결혼식 초대장';
  return getTheme(themeId)?.title ?? '초대장';
}

export function getTheme(id: string): InviteTheme | undefined {
  return THEMES.find((t) => t.id === id);
}
