import type { Icon3DName } from '../components/brand/Icon3D';

/** 배너는 '이미지' 역할 — 색은 여기서만 쓴다 */
export interface Banner {
  id: string;
  title: string;
  body: string;
  bg: string;
  fg: string;
  art: Icon3DName;
}

export const BANNERS: Banner[] = [
  { id: 'b1', title: '첫 초대장은\n무료로 만들 수 있어요', body: '가입 후 바로 시작', bg: '#DDF3EE', fg: '#0E3B33', art: 'gift' },
  { id: 'b2', title: '가을 웨딩 템플릿\n10종이 새로 나왔어요', body: '청첩장 테마에서 확인', bg: '#FCE9EE', fg: '#5C1F31', art: 'leaves' },
  { id: 'b3', title: '사진과 문구만 넣으면\n10분 만에 완성', body: '수정은 횟수 제한 없이', bg: '#FFF4D9', fg: '#4F3705', art: 'alarm' },
];

