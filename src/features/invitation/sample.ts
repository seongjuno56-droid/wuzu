import type { GuestbookEntry } from '../../services/types';
import { createInvitation, Invitation } from './model';

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
  inv.completed = { basic: true, ceremony: true, greeting: true, account: true, guestbook: true, ending: true };
  // 갤러리 사진은 예시가 없으므로 미리보기에서는 빈 칸 안내로 보여준다
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
