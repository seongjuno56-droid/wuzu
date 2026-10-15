export interface Banner {
  id: string;
  eyebrow: string;
  title: string;
  bg: string;
  fg: string;
}

export const BANNERS: Banner[] = [
  { id: 'b1', eyebrow: 'OPEN EVENT', title: '첫 초대장은\n무료로 만들어 보세요', bg: '#1F5E46', fg: '#FFFFFF' },
  { id: 'b2', eyebrow: 'NEW TEMPLATE', title: '가을 웨딩\n신규 템플릿 10종', bg: '#F6EFE2', fg: '#5B4524' },
  { id: 'b3', eyebrow: 'TIP', title: '10분이면 완성되는\n모바일 청첩장', bg: '#E3F0F2', fg: '#24505C' },
  { id: 'b4', eyebrow: 'WUZU', title: '세상의 모든 초대를\n한 장에 담아요', bg: '#F7E9E8', fg: '#7A3A40' },
];

export interface Notice {
  id: string;
  title: string;
  date: string;
}

export const NOTICES: Notice[] = [
  { id: 'n1', title: 'wuzu 서비스 오픈 안내', date: '2026-10-01' },
  { id: 'n2', title: '개인정보 처리방침 개정 안내', date: '2026-09-20' },
];
