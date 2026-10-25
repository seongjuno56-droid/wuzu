import type { KeyValueStorage } from '../../../services/types';
import { createMyRsvp } from '../myRsvp';

it('초대장마다 이 기기에서 낸 응답 id 를 기억한다', async () => {
  const m = new Map<string, string>();
  const storage: KeyValueStorage = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
  const mine = createMyRsvp(storage);
  expect(await mine.get('i')).toBeNull();
  await mine.set('i', 'r1');
  await mine.set('j', 'r2');
  expect(await mine.get('i')).toBe('r1');
  expect(await createMyRsvp(storage).get('j')).toBe('r2');
});
