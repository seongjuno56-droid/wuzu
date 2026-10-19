import { create } from 'zustand';

import type { LetterProduct, PurchaseResult } from '../../services/types';

/** mock 인앱 결제: 결제 요청 하나를 시트에 띄우고 사용자의 선택으로 끝낸다 */
interface PaymentSheetState {
  request: { product: LetterProduct; resolve: (r: PurchaseResult) => void } | null;
  open: (product: LetterProduct) => Promise<PurchaseResult>;
  settle: (r: PurchaseResult) => void;
}

export const usePaymentSheet = create<PaymentSheetState>()((set, get) => ({
  request: null,
  open: (product) =>
    new Promise((resolve) => {
      // 이전 요청이 남아 있으면 취소로 끝낸다
      get().request?.resolve('cancelled');
      set({ request: { product, resolve } });
    }),
  settle: (r) => {
    get().request?.resolve(r);
    set({ request: null });
  },
}));
