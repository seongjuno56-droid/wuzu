import { applyOrder, LEDGER_TITLE, LETTER_PRODUCTS, orderCost, orderLines, SIGNUP_LETTERS } from '../../features/wallet/pricing';
import { newInvitationNumber } from '../../features/invitation/model';
import type { KeyValueStorage, LedgerEntry, SpendOrder, WalletService } from '../types';
import { createInvitationStore } from './invitationStore';

const WALLET_KEY = 'wuzu.mock.wallet.v1';

interface WalletDb {
  balances: Record<string, number>;
  ledger: LedgerEntry[];
}

export function createMockWalletService(opts: { delayMs: number; storage: KeyValueStorage; now?: () => Date }): WalletService {
  const { delayMs, storage } = opts;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const invitations = createInvitationStore(storage);

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
  const targetId = (order: SpendOrder) => (order.kind === 'edit' ? order.invitation.id : order.invitationId);

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
      const [db, invDb] = await Promise.all([load(), invitations.load()]);
      const idx = invDb.invitations.findIndex((i) => i.id === targetId(order));
      const inv = invDb.invitations[idx];
      if (!inv || inv.ownerId !== userId) return { ok: false, reason: 'not_found' };
      const next = applyOrder(inv, order, now());
      if (next === 'blocked' || next === 'invalid') return { ok: false, reason: next };
      const cost = orderCost(order);
      const balance = balanceOf(db, userId);
      if (balance < cost) return { ok: false, reason: 'insufficient' };

      const saved = { ...next, updatedAt: now().toISOString() };
      invDb.invitations[idx] = saved;
      db.balances[userId] = balance - cost;
      db.ledger.push(
        entry({
          userId,
          invitationId: saved.id,
          invitationName: saved.name,
          kind: order.kind,
          title: LEDGER_TITLE[order.kind],
          lines: orderLines(order),
          total: -cost,
        }),
      );
      await invitations.save(invDb);
      await save(db);
      return { ok: true, invitation: saved, balance: db.balances[userId] };
    },

    async charge(userId, productId) {
      await wait();
      const product = LETTER_PRODUCTS.find((p) => p.id === productId);
      if (!product) throw new Error('UNKNOWN_PRODUCT');
      const db = await load();
      const amount = product.letters + product.bonus;
      db.balances[userId] = balanceOf(db, userId) + amount;
      db.ledger.push(
        entry({
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
        }),
      );
      await save(db);
      return db.balances[userId];
    },
  };
}
