import { LEDGER_TITLE, LETTER_PRODUCTS, orderCost, orderLines, SIGNUP_LETTERS } from '../../features/wallet/pricing';
import { newInvitationNumber } from '../../features/invitation/model';
import type { InvitationService, KeyValueStorage, LedgerEntry, SpendOrder, WalletService } from '../types';
import { purchaseNotification } from '../../features/notifications/model';
import { createInvitationStore } from './invitationStore';
import { createMockInvitationService } from './mockInvitationService';
import { createMockNotificationService } from './mockNotificationService';

const WALLET_KEY = 'wuzu.mock.wallet.v1';

interface WalletDb {
  balances: Record<string, number>;
  ledger: LedgerEntry[];
}

/**
 * 레터 잔액은 2단계(인앱결제) 전까지 기기의 mock 이다. 초대장 변경은 invitations 로 넘긴다:
 * 실서버 모드면 서버가 소유자를 확인한다. 없으면 같은 저장소의 mock 초대장을 쓴다.
 */
export function createMockWalletService(opts: {
  delayMs: number;
  storage: KeyValueStorage;
  now?: () => Date;
  invitations?: Pick<InvitationService, 'applyOrder'>;
}): WalletService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const invitations = createInvitationStore(storage);
  const notifications = createMockNotificationService({ delayMs: 0, storage, now });

  async function load(): Promise<WalletDb> {
    const raw = await storage.getItem(WALLET_KEY);
    return raw ? JSON.parse(raw) : { balances: {}, ledger: [] };
  }
  async function save(db: WalletDb) {
    await storage.setItem(WALLET_KEY, JSON.stringify(db));
  }
  const balanceOf = (db: WalletDb, userId: string) => db.balances[userId] ?? SIGNUP_LETTERS;
  const entry = (e: Omit<LedgerEntry, 'id' | 'number' | 'createdAt'>): LedgerEntry => ({
    ...e,
    id: `l-${now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    number: newInvitationNumber(),
    createdAt: now().toISOString(),
  });
  /** 알림은 부가 기능 — 기록이 실패해도 이미 끝난 차감·충전을 실패로 돌리지 않는다(재시도 시 이중 결제 방지) */
  const notify = async (n: Parameters<typeof notifications.add>[0]) => {
    try {
      await notifications.add(n);
    } catch {
      // 알림만 빠진다
    }
  };
  const targetId = (order: SpendOrder) => (order.kind === 'edit' ? order.invitation.id : order.invitationId);
  const mockInvitations = createMockInvitationService({ delayMs: 0, storage, now });
  const applyOrder: (userId: string, order: SpendOrder) => ReturnType<InvitationService['applyOrder']> = opts.invitations
    ? (_userId, order) => opts.invitations!.applyOrder(order)
    : async (userId, order) => {
        const inv = (await invitations.load()).invitations.find((i) => i.id === targetId(order));
        if (!inv || inv.ownerId !== userId) return { ok: false, reason: 'not_found' };
        return mockInvitations.applyOrder(order);
      };

  return {
    async balance(userId) {
      await wait();
      return balanceOf(await load(), userId);
    },

    async history(userId, filter = {}) {
      await wait();
      return (await load()).ledger
        .filter((e) => e.userId === userId)
        .filter((e) => !filter.invitationId || e.invitationId === filter.invitationId)
        .filter((e) => !filter.kind || (filter.kind === 'charge' ? e.kind === 'charge' : e.kind !== 'charge'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async spend(userId, order) {
      await wait();
      const cost = orderCost(order);
      if (balanceOf(await load(), userId) < cost) return { ok: false, reason: 'insufficient' };

      // 거절되거나 던지면(정지 회원·네트워크) 여기서 끝나 레터가 그대로다
      const applied = await applyOrder(userId, order);
      if (!applied.ok) return applied;
      const saved = applied.invitation;

      // 서버를 기다리는 사이 충전됐을 수 있어 다시 읽는다
      const db = await load();
      db.balances[userId] = balanceOf(db, userId) - cost;
      const record = entry({
        userId,
        invitationId: saved.id,
        invitationName: saved.name,
        invitationNumber: saved.number,
        kind: order.kind,
        title: LEDGER_TITLE[order.kind],
        lines: orderLines(order),
        total: -cost,
      });
      db.ledger.push(record);
      await save(db);
      // 구매 알림의 번호는 이력No 가 아니라 초대장No
      await notify(purchaseNotification({ ...record, number: saved.number }));
      return { ok: true, invitation: saved, balance: db.balances[userId] };
    },

    async charge(userId, productId) {
      await wait();
      const product = LETTER_PRODUCTS.find((p) => p.id === productId);
      if (!product) throw new Error('UNKNOWN_PRODUCT');
      const db = await load();
      const amount = product.letters + product.bonus;
      db.balances[userId] = balanceOf(db, userId) + amount;
      const record = entry({
        userId,
        invitationId: null,
        invitationName: null,
        kind: 'charge',
        title: LEDGER_TITLE.charge,
        lines: [
          { label: `레터 ${product.letters}`, amount: product.letters },
          ...(product.bonus ? [{ label: `보너스 ${product.bonus}`, amount: product.bonus }] : []),
        ],
        total: amount,
        priceWon: product.price,
      });
      db.ledger.push(record);
      await save(db);
      await notify(purchaseNotification(record));
      return db.balances[userId];
    },
  };
}
