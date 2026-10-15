import type { Icon3DName } from '../components/brand/Icon3D';

export type ThemeId = 'wedding' | 'dol' | 'meetup' | 'corporate';

export interface InviteTheme {
  id: ThemeId;
  label: string;
  title: string;
  description: string;
  tags: string[];
  /** 3D 일러스트 아이콘 */
  art: Icon3DName;
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
    art: 'bouquet',
    tint: '#D9607E',
    tintSoft: '#FCE9EE',
  },
  {
    id: 'dol',
    label: '돌잔치',
    title: '돌잔치 초대장',
    description: '아이의 첫 생일을 함께해요',
    tags: ['#장군감', '#첫돌', '#내딸내아들'],
    art: 'teddy',
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

export function getTheme(id: string): InviteTheme | undefined {
  return THEMES.find((t) => t.id === id);
}
