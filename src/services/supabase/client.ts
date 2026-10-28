import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { AUTH_STORAGE_KEY } from './authStorage';

/**
 * 앱용 Supabase 클라이언트. 키는 publishable(anon) 키만 쓴다 — service_role 키는 절대 앱에 넣지 않는다.
 * 세션은 AsyncStorage 에 저장하고, OAuth 는 PKCE 로 code 를 직접 교환한다(URL 감지 끔).
 */
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  const client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      // 고정 키: 로그아웃이 서버에 닿지 못해도 이 키로 로컬 세션을 직접 지울 수 있게 (authStorage.ts)
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  // 앱이 앞에 있을 때만 토큰을 자동 갱신한다 (Supabase React Native 권장 방식)
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });

  return client;
}
