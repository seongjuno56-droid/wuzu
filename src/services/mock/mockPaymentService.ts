import { usePaymentSheet } from '../../features/wallet/paymentSheetStore';
import { LETTER_PRODUCTS } from '../../features/wallet/pricing';
import type { PaymentService } from '../types';

/**
 * mock 인앱 결제 — 실제 도입 시 expo-iap(개발용 빌드) + 서버 영수증 검증으로 바꾼다.
 * 앱 루트의 PaymentSheetHost 가 iOS형/구글형 결제 시트를 보여준다.
 */
export function createMockPaymentService(): PaymentService {
  return {
    products: async () => LETTER_PRODUCTS,
    async purchase(productId) {
      const product = LETTER_PRODUCTS.find((p) => p.id === productId);
      if (!product) return 'failed';
      return usePaymentSheet.getState().open(product);
    },
  };
}
