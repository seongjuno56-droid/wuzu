import { Asset } from 'expo-asset';

import type { GuestbookEntry } from '../../services/types';
import { createInvitation, Invitation } from './model';

// 예시 사진: AI 로 만든 실사풍 웨딩 사진 (실존 인물 아님). 화면이 문자열 주소를 받으므로 번들 자산을 주소로 바꾼다
const uri = (mod: number) => Asset.fromModule(mod).uri;
const SAMPLE_PHOTOS = {
  greeting: () => uri(require('../../../assets/sample/greeting.jpg')),
  gallery: () => [
    uri(require('../../../assets/sample/gallery-1.jpg')),
    uri(require('../../../assets/sample/gallery-2.jpg')),
    uri(require('../../../assets/sample/gallery-3.jpg')),
    uri(require('../../../assets/sample/gallery-4.jpg')),
    uri(require('../../../assets/sample/gallery-5.jpg')),
    uri(require('../../../assets/sample/gallery-6.jpg')),
  ],
  ending: () => [uri(require('../../../assets/sample/ending.jpg'))],
};

/** 템플릿 미리보기에 채워 넣는 예시 초대장 (설계 시안의 문구 기준) */
export function sampleInvitation(templateId: string, today: Date = new Date()): Invitation {
  const inv = createInvitation({ id: 'sample', ownerId: '', themeId: 'wedding', templateId, today });
  const c = inv.content;
  c.basic = {
    groom: { name: '홍길동', title: '아들', deceased: false },
    groomFather: { name: '홍철수', title: '아버지', deceased: false },
    groomMother: { name: '이순자', title: '어머니', deceased: false },
    bride: { name: '성춘향', title: '딸', deceased: false },
    brideFather: { name: '성민수', title: '아버지', deceased: false },
    brideMother: { name: '박지영', title: '어머니', deceased: false },
  };
  c.greeting.content =
    '작은 인연이 어느덧 사랑의 결실을 이루어\n평생 함께하겠다는 서약을 여러분 앞에\n맹세하고자 합니다.\n\n행복을 맹세하는 이 날, 귀한 발걸음해주셔서\n축복해주셨으면 합니다.';
  c.ceremony = {
    ...c.ceremony,
    venue: '더채플 웨딩홀',
    hall: '3층 그랜드볼룸',
    address: '서울 강남구 테헤란로 123',
    zonecode: '06133',
    time: '14:00',
  };
  c.account.groom = { bank: '신한은행', number: '969-06-000000' };
  c.account.bride = { bank: '국민은행', number: '110-041-888888' };
  c.greeting.photo = SAMPLE_PHOTOS.greeting();
  c.gallery.photos = SAMPLE_PHOTOS.gallery();
  c.ending.photos = SAMPLE_PHOTOS.ending();
  inv.completed = { basic: true, ceremony: true, greeting: true, account: true, guestbook: true, ending: true };
  inv.enabled = { account: true, gallery: true, guestbook: true, ending: true, bgm: false };
  return inv;
}

export const SAMPLE_GUESTBOOK: GuestbookEntry[] = [
  {
    id: 's1',
    invitationId: 'sample',
    name: '홍길동',
    content: '아주아주 결혼 축하해!! 진짜루!',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  { id: 's2', invitationId: 'sample', name: '김나미', content: '올~ 축하해~ 다컸네', createdAt: '2026-09-30T00:00:00.000Z' },
];
