import { noticeList } from '../../data/notices';
import { noticeNotifications, visibleNotifications } from '../../features/notifications/model';
import type { AppNotification, KeyValueStorage, NotificationService } from '../types';

const KEY = 'wuzu.mock.notifications.v1';

interface Db {
  items: AppNotification[];
  /** 사용자별 마지막 확인 시각 */
  readAt: Record<string, string>;
}

export function createMockNotificationService(opts: { delayMs: number; storage: KeyValueStorage; now?: () => Date }): NotificationService {
  const { delayMs, storage } = opts;
  const clock = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const load = async (): Promise<Db> => {
    const raw = await storage.getItem(KEY);
    return raw ? JSON.parse(raw) : { items: [], readAt: {} };
  };
  const save = (db: Db) => storage.setItem(KEY, JSON.stringify(db));

  /** 공지(모든 사용자) + 내 알림, 보관 기간 안, 최신순 */
  const mine = (db: Db, userId: string, now: Date) =>
    visibleNotifications(
      [...noticeNotifications(noticeList(now)), ...db.items.filter((n) => n.userId === userId)],
      'all',
      now,
    );

  return {
    async list(userId, now = clock()) {
      await wait();
      return mine(await load(), userId, now);
    },
    async add(n) {
      const db = await load();
      db.items.push({ ...n, id: `nt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` });
      await save(db);
    },
    async unreadCount(userId, now = clock()) {
      await wait();
      const db = await load();
      const readAt = db.readAt[userId];
      return mine(db, userId, now).filter((n) => !readAt || n.createdAt > readAt).length;
    },
    async markAllRead(userId, at) {
      const db = await load();
      db.readAt[userId] = at;
      await save(db);
    },
  };
}
