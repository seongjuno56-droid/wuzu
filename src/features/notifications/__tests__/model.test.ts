import { noticeList } from '../../../data/notices';
import type { LedgerEntry } from '../../../services/types';
import { noticeNotifications, purchaseNotification, visibleNotifications } from '../model';

const NOW = new Date(2026, 9, 20, 12);
const DAY = 86400000;
const n = (id: string, category: 'notice' | 'purchase', daysAgo: number) => ({
  id, userId: 'u', category, title: id, body: '', link: '/', createdAt: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
});

describe('알림 보이기', () => {
  it('15일 보관(정확히 15일 전은 안 보임), 최신순, 탭 필터', () => {
    const list = [n('a', 'notice', 1), n('b', 'purchase', 0), n('old', 'notice', 15), n('c', 'purchase', 14.9)];
    expect(visibleNotifications(list, 'all', NOW).map((x) => x.id)).toEqual(['b', 'a', 'c']);
    expect(visibleNotifications(list, 'notice', NOW).map((x) => x.id)).toEqual(['a']);
    expect(visibleNotifications(list, 'purchase', NOW).map((x) => x.id)).toEqual(['b', 'c']);
  });
});

describe('알림 만들기', () => {
  it('공지 → [공지] 제목, 상세로 연결', () => {
    const [first] = noticeNotifications(noticeList());
    expect(first.title.startsWith('[공지] ')).toBe(true);
    expect(first.link).toMatch(/^\/about\/notices\//);
    expect(first.userId).toBeNull();
  });
  it('구매 사용 / 충전', () => {
    const base: LedgerEntry = {
      id: 'l', number: '12312823123', userId: 'u', invitationId: 'i', invitationName: '길동이 청첩장',
      kind: 'activate', title: '초대장 활성화', lines: [{ label: '서비스 활성화', amount: -50 }], total: -50, createdAt: NOW.toISOString(),
    };
    expect(purchaseNotification(base)).toMatchObject({
      category: 'purchase', title: '[구매] 초대장No. 12312823123', body: "'길동이 청첩장' 초대장 활성화 - 50레터 사용", link: '/my-invites',
    });
    const charge = { ...base, kind: 'charge' as const, invitationId: null, invitationName: null, total: 500, priceWon: 50000 };
    expect(purchaseNotification(charge)).toMatchObject({ title: '[구매] 레터 충전', body: '레터 500 충전 - 50,000원', link: '/wallet?tab=charges' });
  });
});

describe('공지 날짜', () => {
  it('보는 날이 바뀌어도 공지 날짜는 그대로다(매일 새 알림이 되지 않게)', () => {
    // 날짜가 지금 시각과 무관하게 고정 — 두 번 불러도, 시간이 지나도 같다
    const first = noticeList().map((n) => n.date);
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 25));
    expect(noticeList().map((n) => n.date)).toEqual(first);
    jest.useRealTimers();
  });
});
