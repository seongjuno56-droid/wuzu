import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '../../services/types';

const KEY = 'wuzu.rsvp.mine.v1';

/** 이 기기에서 낸 참석 응답 id (초대장 id → 응답 id) — 다시 열면 낸 내용을 보여 주고 고칠 수 있게 */
export function createMyRsvp(storage: KeyValueStorage) {
  const load = async (): Promise<Record<string, string>> => JSON.parse((await storage.getItem(KEY)) ?? '{}');
  return {
    async get(invitationId: string) {
      return (await load())[invitationId] ?? null;
    },
    async set(invitationId: string, responseId: string) {
      await storage.setItem(KEY, JSON.stringify({ ...(await load()), [invitationId]: responseId }));
    },
  };
}

export const myRsvp = createMyRsvp(AsyncStorage);
