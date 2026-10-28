import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMockAuthService } from './mock/mockAuthService';
import { createMockInvitationService } from './mock/mockInvitationService';
import { createMockNotificationService } from './mock/mockNotificationService';
import { createMockPaymentService } from './mock/mockPaymentService';
import { createMockRsvpService } from './mock/mockRsvpService';
import { createMockWalletService } from './mock/mockWalletService';
import { clearAuthStorage } from './supabase/authStorage';
import { createSupabaseClient } from './supabase/client';
import { createSupabaseAuthService } from './supabase/supabaseAuthService';
import type { AuthService } from './types';

export * from './types';

// EXPO_PUBLIC_* 는 빌드 때 그대로 박히므로 process.env.이름 으로 직접 읽어야 한다
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase URL·키가 둘 다 있으면 실제 로그인, 아니면 mock (개발·테스트) */
export const usingMockAuth = !(SUPABASE_URL && SUPABASE_ANON_KEY);
export const authService: AuthService =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createSupabaseAuthService(createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY), {
        clearLocalSession: () => clearAuthStorage(AsyncStorage),
      })
    : createMockAuthService({ delayMs: 400, storage: AsyncStorage });

// 아래 서비스는 아직 mock (실서버 도입 시 교체)
export const invitationService = createMockInvitationService({ delayMs: 300, storage: AsyncStorage });
export const walletService = createMockWalletService({ delayMs: 300, storage: AsyncStorage });
export const paymentService = createMockPaymentService();
export const notificationService = createMockNotificationService({ delayMs: 200, storage: AsyncStorage });
export const rsvpService = createMockRsvpService({ delayMs: 200, storage: AsyncStorage });
