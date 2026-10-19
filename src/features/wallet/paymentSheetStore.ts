import { create } from 'zustand';

import type { LetterProduct, PurchaseResult } from '../../services/types';

/** mock 인앱 결제: 결제 요청 하나를 시트에 띄우고 사용자의 선택으로 끝낸다 */
export type PaymentRequest = { product: LetterProduct; resolve: (r: PurchaseResult) => void };

interface PaymentSheetState {
  request: PaymentRequest | null;
  open: (product: LetterProduct) => Promise<PurchaseResult>;
  /** request 를 주면 그 요청이 현재 요청일 때만 끝낸다 */
  settle: (r: PurchaseResult, request?: PaymentRequest) => void;
}

export const usePaymentSheet = create<PaymentSheetState>()((set, get) => ({
  request: null,
  open: (product) =>
    new Promise((resolve) => {
      // 이전 요청이 남아 있으면 취소로 끝낸다
      get().request?.resolve('cancelled');
      set({ request: { product, resolve } });
    }),
  settle: (r, request) => {
    const current = get().request;
    // 이전 요청이 늦게 끝내려는 경우는 무시
    if (request && request !== current) return;
    current?.resolve(r);
    set({ request: null });
  },
}));
