import type { PurchaseResult } from '../../../services/types';
import { LETTER_PRODUCTS } from '../pricing';
import { usePaymentSheet } from '../paymentSheetStore';

const [p1, p2] = LETTER_PRODUCTS;

beforeEach(() => usePaymentSheet.setState({ request: null }));

describe('paymentSheetStore', () => {
  it('새 open 시 이전 요청은 cancelled 로 끝난다', async () => {
    const first = usePaymentSheet.getState().open(p1);
    const second = usePaymentSheet.getState().open(p2);
    await expect(first).resolves.toBe('cancelled');
    expect(usePaymentSheet.getState().request?.product).toBe(p2);
    usePaymentSheet.getState().settle('success');
    await expect(second).resolves.toBe('success');
  });

  it('이전 요청 객체로 settle 하면 현재 요청은 그대로 남는다', async () => {
    const first = usePaymentSheet.getState().open(p1);
    const oldRequest = usePaymentSheet.getState().request!;
    usePaymentSheet.getState().open(p2);
    await first;
    usePaymentSheet.getState().settle('success', oldRequest);
    expect(usePaymentSheet.getState().request?.product).toBe(p2);
  });

  it('현재 요청을 settle 하면 결과가 전달되고 request 는 null', async () => {
    const pending = usePaymentSheet.getState().open(p1);
    const current = usePaymentSheet.getState().request!;
    usePaymentSheet.getState().settle('failed' as PurchaseResult, current);
    await expect(pending).resolves.toBe('failed');
    expect(usePaymentSheet.getState().request).toBeNull();
  });
});
