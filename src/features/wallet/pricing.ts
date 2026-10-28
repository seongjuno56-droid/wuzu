/**
 * 레터 가격·주문 계산 — 가격은 이 파일 한 곳에서만 정한다
 * (설계: docs/superpowers/specs/2026-10-20-my-invitations-and-letters-design.md)
 */
import type { ExtendDays, LedgerKind, LetterProduct, OrderLine, SpendOrder } from '../../services/types';
import type { Invitation } from '../invitation/model';
import { screenStatus } from '../invitation/status';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVATION = { cost: 50, days: 15 } as const;

/** listCost: 정가(취소선) */
export const EXTEND_OPTIONS: { days: ExtendDays; cost: number; listCost?: number }[] = [
  { days: 30, cost: 30 },
  { days: 60, cost: 55, listCost: 60 },
  { days: 180, cost: 150, listCost: 180 },
];

export const EDIT_COST = 5;

/** mock 새 계정 시작 레터 */
export const SIGNUP_LETTERS = 200;

/** 인앱 충전 상품 (1레터 = 100원, 보너스 없음). 실제 금액은 스토어 콘솔에서 확정 */
export const LETTER_PRODUCTS: LetterProduct[] = [
  { id: 'letters_10', letters: 10, bonus: 0, price: 1000 },
  { id: 'letters_50', letters: 50, bonus: 0, price: 5000 },
  { id: 'letters_100', letters: 100, bonus: 0, price: 10000 },
  { id: 'letters_300', letters: 300, bonus: 0, price: 30000 },
  { id: 'letters_500', letters: 500, bonus: 0, price: 50000 },
];

export const LEDGER_TITLE: Record<LedgerKind, string> = {
  activate: '초대장 활성화',
  extend: '기간 연장 구매',
  edit: '초대장 수정',
  charge: '레터 충전',
};

const extendCost = (days: ExtendDays) => EXTEND_OPTIONS.find((o) => o.days === days)!.cost;
const extendLine = (days: ExtendDays): OrderLine => ({ label: `이용 기간 연장 +${days}일`, amount: -extendCost(days) });

/** 구매 정보 줄 */
export function orderLines(order: SpendOrder): OrderLine[] {
  switch (order.kind) {
    case 'activate':
      return [
        { label: '서비스 활성화', amount: -ACTIVATION.cost },
        ...(order.extendDays ? [extendLine(order.extendDays)] : []),
      ];
    case 'extend':
      return [extendLine(order.extendDays)];
    case 'edit':
      return [{ label: '초대장 컨텐츠 수정', amount: -EDIT_COST }];
  }
}

/** 차감할 레터 (양수) */
export const orderCost = (order: SpendOrder) => -orderLines(order).reduce((sum, l) => sum + l.amount, 0);

/**
 * 주문을 초대장에 적용한 결과. 지금 상태에서 할 수 없는 주문이면 'invalid', 제재면 'blocked'.
 * 저장된 초대장(inv)의 상태로 판단하므로 화면을 열어 둔 사이 만료돼도 안전하다.
 */
export function applyOrder(inv: Invitation, order: SpendOrder, now: Date): Invitation | 'blocked' | 'invalid' {
  if (inv.banned) return 'blocked';
  const status = screenStatus(inv, now);
  const plus = (fromMs: number, days: number) => new Date(fromMs + days * DAY_MS).toISOString();
  switch (order.kind) {
    case 'activate':
      if (status !== 'inactive' && status !== 'expired') return 'invalid';
      return { ...inv, activatedAt: now.toISOString(), expiresAt: plus(now.getTime(), ACTIVATION.days + order.extendDays) };
    case 'extend':
      if (status !== 'active') return 'invalid';
      return { ...inv, expiresAt: plus(new Date(inv.expiresAt!).getTime(), order.extendDays) };
    case 'edit':
      if (status !== 'active') return 'invalid';
      // 수정 내용만 받고, 번호·기간·제재·작성자는 저장본 값을 지킨다
      return {
        ...order.invitation,
        id: inv.id,
        ownerId: inv.ownerId,
        number: inv.number,
        status: 'final',
        activatedAt: inv.activatedAt,
        expiresAt: inv.expiresAt,
        banned: inv.banned,
        createdAt: inv.createdAt,
      };
  }
}
