import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMockAuthService } from './mock/mockAuthService';
import { createMockInvitationService } from './mock/mockInvitationService';
import { createMockNotificationService } from './mock/mockNotificationService';
import { createMockPaymentService } from './mock/mockPaymentService';
import { createMockRsvpService } from './mock/mockRsvpService';
import { createMockWalletService } from './mock/mockWalletService';

export * from './types';
export { CODE_TTL_MS, MAX_SEND, MOCK_CODE } from './mock/mockAuthService';

// 실제 서버 도입 시 이 줄만 교체한다.
export const authService = createMockAuthService({ delayMs: 400, storage: AsyncStorage });
export const invitationService = createMockInvitationService({ delayMs: 300, storage: AsyncStorage });
export const walletService = createMockWalletService({ delayMs: 300, storage: AsyncStorage });
export const paymentService = createMockPaymentService();
export const notificationService = createMockNotificationService({ delayMs: 200, storage: AsyncStorage });
export const rsvpService = createMockRsvpService({ delayMs: 200, storage: AsyncStorage });
