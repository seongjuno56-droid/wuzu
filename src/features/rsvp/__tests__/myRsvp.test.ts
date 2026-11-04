import type { KeyValueStorage, RsvpService, RsvpSubmitResult } from '../../../services/types';
import { createMyRsvp, submitWithMyRsvp } from '../myRsvp';
import { emptyRsvpInput, RsvpResponse } from '../rsvp';

const memory = () => {
  const m = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => void m.set(k, v),
  };
  return { m, storage };
};

it('초대장마다 이 기기에서 낸 응답 id·토큰을 기억한다', async () => {
  const { storage } = memory();
  const mine = createMyRsvp(storage);
  expect(await mine.get('i')).toBeNull();
  await mine.set('i', { id: 'r1', token: 't1' });
  await mine.set('j', { id: 'r2', token: 't2' });
  expect(await mine.get('i')).toEqual({ id: 'r1', token: 't1' });
  expect(await createMyRsvp(storage).get('j')).toEqual({ id: 'r2', token: 't2' });
});

it('예전 문자열 값은 무시한다', async () => {
  const { m, storage } = memory();
  m.set('wuzu.rsvp.mine.v1', JSON.stringify({ i: 'r-old' }));
  const mine = createMyRsvp(storage);
  expect(await mine.get('i')).toBeNull();
  await mine.set('j', { id: 'r2', token: 't2' });
  expect(await mine.get('j')).toEqual({ id: 'r2', token: 't2' });
});

describe('submitWithMyRsvp', () => {
  const args = { invitationId: 'i', themeId: 'corporate', deadline: '', input: emptyRsvpInput() };
  const response = { id: 'new', invitationId: 'i' } as RsvpResponse;
  const service = (...results: RsvpSubmitResult[]) => {
    const submit = jest.fn<Promise<RsvpSubmitResult>, Parameters<RsvpService['submit']>>();
    results.forEach((r) => submit.mockResolvedValueOnce(r));
    return { submit };
  };

  it('처음 내면 받은 id·토큰을 저장한다', async () => {
    const mine = createMyRsvp(memory().storage);
    const s = service({ ok: true, response, token: 'tok', created: true });
    const r = await submitWithMyRsvp(mine, s, args);
    expect(r.ok).toBe(true);
    expect(s.submit).toHaveBeenCalledWith(args);
    expect(await mine.get('i')).toEqual({ id: 'new', token: 'tok' });
  });

  it('저장값이 있으면 그 id·토큰으로 고친다', async () => {
    const mine = createMyRsvp(memory().storage);
    await mine.set('i', { id: 'r1', token: 't1' });
    const s = service({ ok: true, response: { ...response, id: 'r1' }, token: 't1', created: false });
    await submitWithMyRsvp(mine, s, args);
    expect(s.submit).toHaveBeenCalledWith({ ...args, id: 'r1', token: 't1' });
  });

  it('저장값이 무효(not_found)면 새 제출로 다시 내고 저장값을 바꾼다', async () => {
    const mine = createMyRsvp(memory().storage);
    await mine.set('i', { id: 'r1', token: 'bad' });
    const s = service({ ok: false, reason: 'not_found' }, { ok: true, response, token: 'tok', created: true });
    const r = await submitWithMyRsvp(mine, s, args);
    expect(r.ok && r.created).toBe(true);
    expect(s.submit).toHaveBeenLastCalledWith(args);
    expect(await mine.get('i')).toEqual({ id: 'new', token: 'tok' });
  });

  it('다시 내도 not_found 면 저장값을 지우지 않는다 (초대장이 닫힌 경우, 기간 연장 뒤 다시 고칠 수 있게)', async () => {
    const mine = createMyRsvp(memory().storage);
    await mine.set('i', { id: 'r1', token: 't1' });
    const s = service({ ok: false, reason: 'not_found' }, { ok: false, reason: 'not_found' });
    expect(await submitWithMyRsvp(mine, s, args)).toEqual({ ok: false, reason: 'not_found' });
    expect(await mine.get('i')).toEqual({ id: 'r1', token: 't1' });
  });

  it('서버 제출 성공 뒤 기기 저장이 실패해도 성공을 돌려준다', async () => {
    const { storage } = memory();
    const mine = createMyRsvp({ ...storage, setItem: async () => Promise.reject(new Error('저장 실패')) });
    const s = service({ ok: true, response, token: 'tok', created: true });
    const r = await submitWithMyRsvp(mine, s, args);
    expect(r.ok).toBe(true);
  });

  it('저장값이 없으면 not_found 를 다시 내지 않는다', async () => {
    const mine = createMyRsvp(memory().storage);
    const s = service({ ok: false, reason: 'not_found' });
    await submitWithMyRsvp(mine, s, args);
    expect(s.submit).toHaveBeenCalledTimes(1);
  });
});
