import { create } from 'zustand';

import { walletService } from '../../services';
import { useSession } from '../../store/session';

/** 보유 레터 — 화면에 돌아올 때 refresh, 구매·충전 직후 set */
interface WalletState {
  balance: number | null;
  refresh: () => Promise<void>;
  set: (balance: number) => void;
}

export const useWallet = create<WalletState>()((set) => ({
  balance: null,
  refresh: async () => {
    const userId = useSession.getState().user?.id;
    set({ balance: userId ? await walletService.balance(userId) : null });
  },
  set: (balance) => set({ balance }),
}));
