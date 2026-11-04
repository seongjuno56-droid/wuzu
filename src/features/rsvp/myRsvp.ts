import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage, RsvpService, RsvpSubmitResult } from '../../services/types';

const KEY = 'wuzu.rsvp.mine.v1';

export interface MyRsvpRef {
  id: string;
  token: string;
}

const isRef = (v: unknown): v is MyRsvpRef =>
  typeof v === 'object' && v !== null && typeof (v as MyRsvpRef).id === 'string' && typeof (v as MyRsvpRef).token === 'string';

/** 이 기기에서 낸 참석 응답 (초대장 id → 응답 id·토큰) — 다시 열면 낸 내용을 보여 주고 고칠 수 있게. 예전 문자열 값은 토큰이 없어 무시한다 */
export function createMyRsvp(storage: KeyValueStorage) {
  const load = async (): Promise<Record<string, unknown>> => JSON.parse((await storage.getItem(KEY)) ?? '{}');
  return {
    async get(invitationId: string): Promise<MyRsvpRef | null> {
      const v = (await load())[invitationId];
      return isRef(v) ? v : null;
    },
    async set(invitationId: string, ref: MyRsvpRef) {
      await storage.setItem(KEY, JSON.stringify({ ...(await load()), [invitationId]: ref }));
    },
  };
}

export const myRsvp = createMyRsvp(AsyncStorage);

/**
 * 저장한 id·토큰으로 제출하고, 성공하면 저장값을 바꾼다.
 * 저장값이 무효(만든 사람이 지움 등)면 서버는 not_found 를 주고 행을 만들지 않으므로 새 제출로 한 번 더 낸다.
 * 다시 내도 not_found 면 초대장이 닫힌 것이다. 기간을 연장하면 다시 고칠 수 있게 저장값을 지우지 않는다.
 */
export async function submitWithMyRsvp(
  mine: ReturnType<typeof createMyRsvp>,
  service: Pick<RsvpService, 'submit'>,
  args: Omit<Parameters<RsvpService['submit']>[0], 'id' | 'token'>,
): Promise<RsvpSubmitResult> {
  const saved = await mine.get(args.invitationId);
  let r = await service.submit(saved ? { ...args, id: saved.id, token: saved.token } : args);
  if (!r.ok && r.reason === 'not_found' && saved) r = await service.submit(args);
  if (r.ok) {
    // 응답은 이미 서버에 들어갔다. 기기 저장이 실패해도 실패로 돌리지 않는다(다시 보내면 응답이 겹친다)
    await mine.set(args.invitationId, { id: r.response.id, token: r.token ?? saved?.token ?? '' }).catch(() => {});
  }
  return r;
}
