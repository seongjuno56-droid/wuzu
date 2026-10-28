/** 공지사항 mock (실서버 도입 시 어드민 등록 데이터로 교체). 날짜는 고정 기준일에서 며칠 전 — 보는 날에 따라 바뀌지 않는다 */
export type NoticeCategory = 'service' | 'promotion' | 'update' | 'etc';

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  service: '서비스',
  promotion: '프로모션',
  update: '업데이트',
  etc: '기타',
};

export interface Notice {
  id: string;
  category: NoticeCategory;
  title: string;
  body: string;
  /** ISO */
  date: string;
}

/** mock 공지 기준일 (실제 공지는 어드민 등록일) */
const BASE_DATE = new Date(2026, 9, 19, 10, 0, 0);

const BODY = '안녕하세요. 우쥬입니다.\n\n보다 안정적인 서비스를 위해 서버 점검을 진행합니다.\n점검 시간에는 초대장 제작과 레터 충전이 잠시 중단됩니다.\n\n이용에 불편을 드려 죄송합니다.';

const RAW: { id: string; category: NoticeCategory; title: string; daysAgo: number; body?: string }[] = [
  { id: 'n6', category: 'service', title: '우쥬 긴급 서비스 점검 안내', daysAgo: 1 },
  { id: 'n5', category: 'update', title: '스토리형 초대장 업데이트 안내', daysAgo: 4, body: '안녕하세요. 우쥬입니다.\n\n한 장씩 넘겨 보는 스토리형 초대장이 곧 추가됩니다.' },
  { id: 'n4', category: 'promotion', title: '첫 초대장 활성화 이벤트', daysAgo: 9, body: '안녕하세요. 우쥬입니다.\n\n첫 초대장을 활성화하시면 기간 연장 30일을 드립니다.' },
  { id: 'n3', category: 'service', title: '개인정보 처리방침 개정 안내', daysAgo: 20 },
  { id: 'n2', category: 'etc', title: '고객센터 운영 시간 안내', daysAgo: 40, body: '안녕하세요. 우쥬입니다.\n\n고객센터는 평일 10시~18시에 운영합니다.' },
  { id: 'n1', category: 'service', title: '우쥬 서비스 오픈 안내', daysAgo: 60, body: '안녕하세요. 우쥬입니다.\n\n휴대폰으로 직접 만드는 초대장, 우쥬를 시작합니다.' },
];

/** 최신순 공지 목록 */
export function noticeList(): Notice[] {
  return RAW.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    body: r.body ?? BODY,
    date: new Date(BASE_DATE.getTime() - r.daysAgo * 86400000).toISOString(),
  }));
}

export const findNotice = (id: string) => noticeList().find((n) => n.id === id) ?? null;
