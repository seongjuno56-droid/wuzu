import AsyncStorage from '@react-native-async-storage/async-storage';

import { AUTH_STORAGE_KEY, clearAuthStorage } from '../supabase/authStorage';

beforeEach(() => AsyncStorage.clear());

describe('clearAuthStorage', () => {
  it('auth-js 가 쓰는 세션·사용자·PKCE 키를 모두 지우고 다른 키는 남긴다', async () => {
    const key = AUTH_STORAGE_KEY;
    await AsyncStorage.multiSet([
      [key, '{"access_token":"a"}'],
      [`${key}-user`, '{"user":{}}'],
      [`${key}-code-verifier`, 'v'],
      [`${key}-flows-code-verifier`, '["f1"]'],
      [`${key}-flow-f1-code-verifier`, 'v1'],
      ['wuzu.session.v1', '{"state":{}}'],
      ['other', 'x'],
    ]);
    await clearAuthStorage(AsyncStorage);
    const left = [...(await AsyncStorage.getAllKeys())].sort();
    expect(left).toEqual(['other', 'wuzu.session.v1']);
  });

  it('저장된 것이 없어도 실패하지 않는다', async () => {
    await expect(clearAuthStorage(AsyncStorage)).resolves.toBeUndefined();
  });
});
