import { Asset } from 'expo-asset';

import type { GuestbookEntry } from '../../services/types';
import { addDays, seedTimeline } from './dol';
import { asWedding, CorporateContent, DolContent, Invitation, toDateString } from './model';
import { createInvitation, sectionTabs } from './themes';

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

/** 템플릿 미리보기에 채워 넣는 예시 초대장 — 테마별 */
export function sampleInvitation(themeId: string, templateId: string, today: Date = new Date()): Invitation {
  if (themeId === 'dol') return dolSample(templateId, today);
  if (themeId === 'corporate') return corporateSample(templateId, today);
  return weddingSample(templateId, today);
}

/** 결혼식 예시 (설계 시안의 문구 기준) */
function weddingSample(templateId: string, today: Date): Invitation {
  const inv = createInvitation({ id: 'sample', ownerId: '', themeId: 'wedding', templateId, today });
  const c = asWedding(inv.content);
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

// 돌잔치 예시 사진: AI 로 만든 실사풍 사진 (실존 인물 아님)
const DOL_PHOTOS = {
  cover: () => uri(require('../../../assets/sample/dol/cover.jpg')),
  profile: () => uri(require('../../../assets/sample/dol/profile.jpg')),
  born: () => uri(require('../../../assets/sample/dol/born.jpg')),
  day100: () => uri(require('../../../assets/sample/dol/day100.jpg')),
  walk: () => uri(require('../../../assets/sample/dol/walk.jpg')),
  first: () => uri(require('../../../assets/sample/dol/first.jpg')),
  gallery: () => [
    uri(require('../../../assets/sample/dol/gallery-1.jpg')),
    uri(require('../../../assets/sample/dol/gallery-2.jpg')),
    uri(require('../../../assets/sample/dol/gallery-3.jpg')),
    uri(require('../../../assets/sample/dol/gallery-4.jpg')),
  ],
};

/** 돌잔치 예시 — 비비드바우스 샘플 구성을 참고한 시안이의 첫 생일 (이름·문구는 예시) */
function dolSample(templateId: string, today: Date): Invitation {
  const inv = createInvitation({ id: 'sample', ownerId: '', themeId: 'dol', templateId, today });
  const c = inv.content as DolContent;
  // 행사일은 일주일 뒤, 태어난 날은 그 1년 전
  const event = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const birth = addDays(event, -365);
  const [dad, mom] = c.basic.guardians;
  c.basic = {
    ...c.basic,
    childName: /* i18n-ignore */ '이시안',
    birthDate: birth,
    photo: DOL_PHOTOS.cover(),
    guardians: [
      { ...dad, name: /* i18n-ignore */ '이윤종' },
      { ...mom, name: /* i18n-ignore */ '이다영' },
    ],
  };
  c.ceremony = {
    ...c.ceremony,
    date: event,
    time: '12:00',
    venue: /* i18n-ignore */ '비비드 파티룸',
    hall: /* i18n-ignore */ '2층 루프홀',
    address: /* i18n-ignore */ '경기 성남시 분당구 정자일로 95',
    zonecode: '13561',
  };
  c.profile = {
    photo: DOL_PHOTOS.profile(),
    intro: /* i18n-ignore */ '울다 웃다 자다\n그렇게 1년,\n이제 돌이에요.',
    hashtags: [/* i18n-ignore */ '웃음요정', /* i18n-ignore */ '잠꾸러기'],
  };
  const photos = [DOL_PHOTOS.born(), DOL_PHOTOS.day100(), DOL_PHOTOS.walk(), DOL_PHOTOS.first()];
  c.timeline = {
    items: seedTimeline([], birth, event).map((it, i) => ({
      ...it,
      photo: photos[i],
      // 첫 걸음마는 날짜를 비워 두는 항목이라 예시에서는 채운다
      date: it.date || addDays(birth, 300),
    })),
  };
  c.account = {
    ...c.account,
    accounts: {
      [dad.id]: { bank: /* i18n-ignore */ '신한은행', number: '110-123-456789' },
      [mom.id]: { bank: /* i18n-ignore */ '국민은행', number: '123-45-678901' },
    },
  };
  c.gallery = { ...c.gallery, photos: [...DOL_PHOTOS.gallery(), DOL_PHOTOS.profile(), DOL_PHOTOS.first()] };
  c.ending = { ...c.ending, photos: [DOL_PHOTOS.walk()] };
  inv.completed = { basic: true, ceremony: true, greeting: true, profile: true, timeline: true, account: true, guestbook: true, ending: true, gallery: true };
  return inv;
}

// 기업 예시 사진: AI 로 만든 사진 (실존 인물·회사 아님)
const CORP_PHOTOS = {
  hall: () => uri(require('../../../assets/sample/corporate/hall.jpg')),
  networking: () => uri(require('../../../assets/sample/corporate/networking.jpg')),
  logo: () => uri(require('../../../assets/sample/corporate/logo.png')),
  speakers: () => [
    uri(require('../../../assets/sample/corporate/speaker-1.jpg')),
    uri(require('../../../assets/sample/corporate/speaker-2.jpg')),
    uri(require('../../../assets/sample/corporate/speaker-3.jpg')),
  ],
};

/** 기업 예시 — 가상의 회사 '우주컴퍼니' 파트너스 데이 (이름·문구는 예시) */
function corporateSample(templateId: string, today: Date): Invitation {
  const inv = createInvitation({ id: 'sample', ownerId: '', themeId: 'corporate', templateId, today });
  const c = inv.content as CorporateContent;
  const days = (n: number) => toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  c.basic = {
    eventName: /* i18n-ignore */ '2026 우주 파트너스 데이',
    host: /* i18n-ignore */ '(주)우주컴퍼니',
    logo: CORP_PHOTOS.logo(),
    inviterTitle: /* i18n-ignore */ '대표이사',
    inviterName: /* i18n-ignore */ '김우주',
  };
  c.ceremony = {
    ...c.ceremony,
    date: days(14),
    time: '14:00',
    venue: /* i18n-ignore */ '우주 컨벤션센터',
    hall: /* i18n-ignore */ '3층 그랜드홀',
    address: /* i18n-ignore */ '서울 강남구 테헤란로 521',
    zonecode: '06164',
    audience: /* i18n-ignore */ '파트너사 임직원',
    dressCode: /* i18n-ignore */ '비즈니스 캐주얼',
  };
  c.greeting = { ...c.greeting, photo: CORP_PHOTOS.hall() };
  c.program = {
    items: [
      ['14:00', /* i18n-ignore */ '등록 및 네트워킹', ''],
      ['14:30', /* i18n-ignore */ '개회사', /* i18n-ignore */ '대표이사 김우주'],
      ['15:00', /* i18n-ignore */ '기조 강연', /* i18n-ignore */ '박서연 연구소장'],
      ['16:00', /* i18n-ignore */ '파트너 세션', /* i18n-ignore */ '이준호 · 최민지'],
      ['17:30', /* i18n-ignore */ '만찬', ''],
    ].map(([time, title, detail], i) => ({ id: `p${i}`, time, title, detail })),
  };
  const faces = CORP_PHOTOS.speakers();
  c.speakers = {
    items: [
      [/* i18n-ignore */ '박서연', /* i18n-ignore */ '우주랩 연구소장', /* i18n-ignore */ 'AI가 바꾸는 일하는 방식'],
      [/* i18n-ignore */ '이준호', /* i18n-ignore */ '그로스팀 리드', /* i18n-ignore */ '작은 팀의 큰 성장'],
      [/* i18n-ignore */ '최민지', /* i18n-ignore */ '디자인 디렉터', /* i18n-ignore */ '브랜드 경험 설계'],
    ].map(([name, title, line], i) => ({ id: `s${i}`, photo: faces[i], name, title, line })),
  };
  c.directions = {
    parking: /* i18n-ignore */ '건물 지하 2~4층 주차 (3시간 무료)',
    transit: /* i18n-ignore */ '2호선 삼성역 5번 출구 도보 5분',
  };
  c.rsvp = { deadline: days(10) };
  c.contact = { name: /* i18n-ignore */ '행사 사무국', phone: '02-123-4567', email: 'event@wuzu.example' };
  c.ending = { ...c.ending, photos: [CORP_PHOTOS.networking()] };
  inv.enabled = { ...inv.enabled, speakers: true };
  inv.completed = Object.fromEntries(sectionTabs(inv).map((k) => [k, true]));
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
