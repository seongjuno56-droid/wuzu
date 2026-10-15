import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type ThemeId = 'wedding' | 'dol' | 'meetup' | 'corporate';

export interface InviteTheme {
  id: ThemeId;
  label: string;
  title: string;
  description: string;
  tags: string[];
  icon: ComponentProps<typeof Ionicons>['name'];
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
    icon: 'heart',
    tint: '#B5646B',
    tintSoft: '#F7E9E8',
  },
  {
    id: 'dol',
    label: '돌잔치',
    title: '돌잔치 초대장',
    description: '아이의 첫 생일을 함께해요',
    tags: ['#장군감', '#첫돌', '#내딸내아들'],
    icon: 'balloon',
    tint: '#C38B2E',
    tintSoft: '#FAF0DC',
  },
  {
    id: 'meetup',
    label: '모임',
    title: '모임 초대장',
    description: '생일, 동창회, 집들이까지',
    tags: ['#생일도', '#동창회도', '#뭐든좋아'],
    icon: 'people',
    tint: '#3C7A8C',
    tintSoft: '#E3F0F2',
  },
  {
    id: 'corporate',
    label: '기업 행사',
    title: '기업 행사 초대장',
    description: '송년회, 신년회, 세미나',
    tags: ['#송년회', '#신년회', '#유대감뿜뿜'],
    icon: 'business',
    tint: '#1F5E46',
    tintSoft: '#E8F1EC',
  },
];

export function getTheme(id: string): InviteTheme | undefined {
  return THEMES.find((t) => t.id === id);
}
