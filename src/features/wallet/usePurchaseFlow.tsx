import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { toast } from '../../components/Toast';
import { SpendOrder, walletService } from '../../services';
import { useSession } from '../../store/session';
import type { Invitation } from '../invitation/model';
import { confirmWithBiometrics } from './confirm';
import { orderCost } from './pricing';
import { useWallet } from './useWallet';

/**
 * 레터 구매 공통 흐름:
 * ask(): 잔액이 모자라면 충전 안내, 아니면 확인 모달 → run()
 * run(): 생체인증 → 차감·반영 → onDone
 */
export function usePurchaseFlow({ onDone }: { onDone: (invitation: Invitation) => void }) {
  const userId = useSession((s) => s.user?.id);
  const [confirm, setConfirm] = useState<{ order: SpendOrder; title: string; message?: string } | null>(null);
  const [lacking, setLacking] = useState(false);
  const [busy, setBusy] = useState(false);

  const running = useRef(false);

  const run = async (order: SpendOrder) => {
    // 인증 대기 중 중복 실행도 막는다
    if (!userId || running.current) return;
    running.current = true;
    let done: Invitation | null = null;
    try {
      if (!(await confirmWithBiometrics())) {
        toast('인증이 취소되었어요.');
        return;
      }
      setBusy(true);
      try {
        const r = await walletService.spend(userId, order);
        if (r.ok) {
          useWallet.getState().set(r.balance);
          done = r.invitation;
        } else if (r.reason === 'insufficient') setLacking(true);
        else if (r.reason === 'blocked') toast('사용불가 초대장은 구매할 수 없어요.');
        else toast('초대장 상태가 바뀌었어요. 다시 확인해 주세요.');
      } catch {
        toast('구매하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setBusy(false);
      }
    } finally {
      running.current = false;
    }
    // 구매가 끝난 뒤의 후속 처리는 결제 오류 처리와 분리
    if (done) onDone(done);
  };

  const ask = async (order: SpendOrder, title: string, message?: string) => {
    let current = useWallet.getState().balance;
    if (current === null) {
      await useWallet.getState().refresh();
      current = useWallet.getState().balance;
    }
    if ((current ?? 0) < orderCost(order)) setLacking(true);
    else setConfirm({ order, title, message });
  };

  const modals = (
    <>
      <AppModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        onDismiss={() => setConfirm(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setConfirm(null) },
          {
            label: '구매하기',
            onPress: () => {
              const order = confirm!.order;
              setConfirm(null);
              run(order);
            },
          },
        ]}
      />
      <AppModal
        visible={lacking}
        title={'레터가 부족합니다.\n레터를 충전하시겠습니까?'}
        onDismiss={() => setLacking(false)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setLacking(false) },
          {
            label: '레터 충전',
            onPress: () => {
              setLacking(false);
              router.push('/wallet');
            },
          },
        ]}
      />
    </>
  );

  return { ask, run, busy, modals, lack: () => setLacking(true) };
}
