/** WUZU 알림 규칙 — 15일 보관, 최신순, 탭(전체/공지/구매) */
import type { Notice } from '../../data/notices';
import type { AppNotification, LedgerEntry } from '../../services/types';
import { usageText } from '../wallet/history';

export const KEEP_DAYS = 15;
export type NotificationTab = 'all' | 'notice' | 'purchase';

export function visibleNotifications<T extends Pick<AppNotification, 'category' | 'createdAt'>>(
  list: T[],
  tab: NotificationTab,
  now: Date,
): T[] {
  const limit = now.getTime() - KEEP_DAYS * 86400000;
  return list
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => Date.parse(n.createdAt) > limit && (tab === 'all' || n.category === tab))
    // 최신순, 같은 시각이면 나중에 추가된 것 먼저
    .sort((a, b) => b.n.createdAt.localeCompare(a.n.createdAt) || b.i - a.i)
    .map(({ n }) => n);
}

export const noticeNotifications = (notices: Notice[]): AppNotification[] =>
  notices.map((n) => ({
    id: `notice-${n.id}`,
    userId: null,
    category: 'notice',
    title: `[공지] ${n.title}`,
    body: '',
    link: `/about/notices/${n.id}`,
    createdAt: n.date,
  }));

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 레터 사용·충전 기록 → 구매 알림 (사용 기록은 number 에 초대장No 를 담아 넘긴다) */
export function purchaseNotification(e: LedgerEntry): Omit<AppNotification, 'id'> {
  if (e.kind === 'charge') {
    return {
      userId: e.userId,
      category: 'purchase',
      title: '[구매] 레터 충전',
      body: `레터 ${e.total} 충전 - ${won(e.priceWon ?? 0)}`,
      link: '/wallet?tab=charges',
      createdAt: e.createdAt,
    };
  }
  return {
    userId: e.userId,
    category: 'purchase',
    title: `[구매] 초대장No. ${e.number}`,
    body: `${usageText(e)} - ${-e.total}레터 사용`,
    link: '/my-invites',
    createdAt: e.createdAt,
  };
}
