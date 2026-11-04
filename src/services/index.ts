import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMockAuthService } from './mock/mockAuthService';
import { createMockInvitationService } from './mock/mockInvitationService';
import { createMockNotificationService } from './mock/mockNotificationService';
import { createMockPaymentService } from './mock/mockPaymentService';
import { createMockRsvpService } from './mock/mockRsvpService';
import { createMockWalletService } from './mock/mockWalletService';
import type { MediaUploader } from './media/uploadDraftMedia';
import { clearAuthStorage } from './supabase/authStorage';
import { createSupabaseClient } from './supabase/client';
import { createMediaUploader } from './supabase/mediaUploader';
import { createSupabaseAuthService } from './supabase/supabaseAuthService';
import { createSupabaseInvitationService } from './supabase/supabaseInvitationService';
import { createSupabaseRsvpService } from './supabase/supabaseRsvpService';
import type { AuthService, InvitationService, RsvpService } from './types';

export * from './types';

// EXPO_PUBLIC_* 는 빌드 때 그대로 박히므로 process.env.이름 으로 직접 읽어야 한다
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase URL·키가 둘 다 있으면 실서버(로그인·초대장·참석 응답), 아니면 mock (개발·테스트) */
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const usingMockAuth = !supabase;
export const authService: AuthService = supabase
  ? createSupabaseAuthService(supabase, { clearLocalSession: () => clearAuthStorage(AsyncStorage) })
  : createMockAuthService({ delayMs: 400, storage: AsyncStorage });

export const invitationService: InvitationService = supabase
  ? createSupabaseInvitationService(supabase)
  : createMockInvitationService({ delayMs: 300, storage: AsyncStorage });
export const rsvpService: RsvpService = supabase
  ? createSupabaseRsvpService(supabase)
  : createMockRsvpService({ delayMs: 200, storage: AsyncStorage });
/** 파일 올리기. mock 은 파일을 기기에 두므로 없다 */
export const mediaUploader: MediaUploader | null = supabase ? createMediaUploader(supabase) : null;

// 아래 서비스는 아직 mock (실서버 도입 시 교체). 지갑은 잔액만 mock 이고 초대장 변경은 실서버로 간다
export const walletService = createMockWalletService({
  delayMs: 300,
  storage: AsyncStorage,
  invitations: supabase ? invitationService : undefined,
});
export const paymentService = createMockPaymentService();
export const notificationService = createMockNotificationService({ delayMs: 200, storage: AsyncStorage });
