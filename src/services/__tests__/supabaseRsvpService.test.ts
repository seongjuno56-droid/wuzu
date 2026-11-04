import type { SupabaseClient } from '@supabase/supabase-js';

import { emptyRsvpInput } from '../../features/rsvp/rsvp';
import { createSupabaseRsvpService } from '../supabase/supabaseRsvpService';

const INV = '11111111-2222-4333-8444-555555555555';
const RES = '99999999-2222-4333-8444-555555555555';
const TOKEN = 'a'.repeat(64);
const input = { ...emptyRsvpInput(), name: '홍길동', org: '우주', phone: '010-1234-5678' };
const response = { ...input, id: RES, invitationId: INV, source: 'guest', createdAt: 'c', updatedAt: 'u' };

function fake(answers: Record<string, { data?: unknown; error?: { message: string } }> = {}) {
  const rpc = jest.fn(async (fn: string, _args?: Record<string, unknown>, _opts?: unknown) => {
    const a = answers[fn];
    return { data: a?.data ?? null, error: a?.error ?? null };
  });
  return { rpc, service: createSupabaseRsvpService({ rpc } as unknown as SupabaseClient) };
}
const submitArgs = { invitationId: INV, themeId: 'corporate', deadline: '', input };

describe('Supabase 참석 응답 서비스', () => {
  it('처음 제출은 응답 id·토큰을 null 로 보내고, 받은 토큰을 돌려준다', async () => {
    const { rpc, service } = fake({
      guest_rsvp_submit: { data: { ok: true, response, token: TOKEN, created: true } },
    });
    expect(await service.submit(submitArgs)).toEqual({ ok: true, response, token: TOKEN, created: true });
    expect(rpc).toHaveBeenCalledWith('guest_rsvp_submit', { p_id: INV, p_input: input, p_response: null, p_token: null });
  });

  it('고치기는 저장한 id·토큰을 보낸다', async () => {
    const { rpc, service } = fake({
      guest_rsvp_submit: { data: { ok: true, response, token: TOKEN, created: false } },
    });
    const r = await service.submit({ ...submitArgs, id: RES, token: TOKEN });
    expect(r.ok && r.created).toBe(false);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_response: RES, p_token: TOKEN });
  });

  it.each(['not_found', 'closed', 'invalid', 'rate_limited'] as const)('제출 거절 %s 는 값으로 돌려준다', async (reason) => {
    const { service } = fake({ guest_rsvp_submit: { data: { ok: false, reason } } });
    expect(await service.submit(submitArgs)).toEqual({ ok: false, reason });
  });

  it('제출 네트워크 오류는 던진다', async () => {
    const { service } = fake({ guest_rsvp_submit: { error: { message: 'Network request failed' } } });
    await expect(service.submit(submitArgs)).rejects.toThrow('Network');
  });

  it('get 은 토큰이 주소에 들어가지 않게 POST 로만 부른다 (get: true 를 쓰지 않는다)', async () => {
    const { rpc, service } = fake({ guest_rsvp_get: { data: response } });
    expect(await service.get(INV, RES, TOKEN)).toEqual(response);
    expect(rpc.mock.calls[0]).toEqual(['guest_rsvp_get', { p_id: INV, p_response: RES, p_token: TOKEN }]);
  });

  it('get 은 토큰이 없으면 부르지 않고 null, 네트워크 오류는 던진다', async () => {
    const none = fake();
    expect(await none.service.get(INV, RES)).toBeNull();
    expect(none.rpc).not.toHaveBeenCalled();
    const down = fake({ guest_rsvp_get: { error: { message: 'Network request failed' } } });
    await expect(down.service.get(INV, RES, TOKEN)).rejects.toThrow('Network');
  });

  it('명단 네트워크 오류는 빈 목록으로 삼키지 않는다', async () => {
    const { service } = fake({ owner_rsvp_list: { error: { message: 'Network request failed' } } });
    await expect(service.list(INV)).rejects.toThrow('Network');
  });

  it('만든 사람 쓰기는 owner RPC 로 가고, 서버 예외는 그대로 던진다', async () => {
    const { rpc, service } = fake({ owner_rsvp_add: { data: response }, owner_rsvp_update: { data: response } });
    expect(await service.addManual(INV, 'corporate', input)).toEqual(response);
    expect(await service.update(INV, 'corporate', RES, input)).toEqual(response);
    await service.remove(INV, RES);
    expect(rpc.mock.calls).toEqual([
      ['owner_rsvp_add', { p_id: INV, p_input: input }],
      ['owner_rsvp_update', { p_id: INV, p_response: RES, p_input: input }],
      ['owner_rsvp_remove', { p_id: INV, p_response: RES }],
    ]);
    const full = fake({ owner_rsvp_add: { error: { message: 'RATE_LIMITED' } } });
    await expect(full.service.addManual(INV, 'corporate', input)).rejects.toThrow('RATE_LIMITED');
    const gone = fake({ owner_rsvp_update: { error: { message: 'NOT_FOUND' } } });
    await expect(gone.service.update(INV, 'corporate', RES, input)).rejects.toThrow('NOT_FOUND');
  });
});
