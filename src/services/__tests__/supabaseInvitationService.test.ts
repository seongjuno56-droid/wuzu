import type { SupabaseClient } from '@supabase/supabase-js';

import type { Invitation } from '../../features/invitation/model';
import { createInvitation } from '../../features/invitation/themes';
import { createSupabaseInvitationService } from '../supabase/supabaseInvitationService';

const UUID = '11111111-2222-4333-8444-555555555555';
const ENTRY = '99999999-2222-4333-8444-555555555555';

/** 함수 이름별로 정해 둔 응답을 돌려주는 가짜 client.rpc */
function fake(answers: Record<string, { data?: unknown; error?: { message: string } }> = {}) {
  const rpc = jest.fn(async (fn: string, _args?: Record<string, unknown>) => {
    const a = answers[fn];
    return { data: a?.data ?? null, error: a?.error ?? null };
  });
  return { rpc, service: createSupabaseInvitationService({ rpc } as unknown as SupabaseClient) };
}

const draft = (patch: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'inv-local', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }),
  name: '우리 결혼',
  ...patch,
});
const NETWORK = { error: { message: 'TypeError: Network request failed' } };

describe('Supabase 초대장 서비스', () => {
  it('save 는 새 초대장이면 p_id null 로 보내고 받은 uuid 를 돌려준다', async () => {
    const { rpc, service } = fake({ save_my_invitation: { data: { ...draft(), id: UUID, number: '12345678901' } } });
    const inv = draft();
    const saved = await service.save(inv);
    expect(rpc).toHaveBeenCalledWith('save_my_invitation', { p_id: null, p_data: inv });
    expect(saved.id).toBe(UUID);
    expect(saved.number).toBe('12345678901');
  });

  it('save 는 서버 id 가 있으면 그 id 로 보낸다', async () => {
    const { rpc, service } = fake({ save_my_invitation: { data: draft({ id: UUID }) } });
    await service.save(draft({ id: UUID }));
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_id: UUID });
  });

  it('PAID_EDIT_REQUIRED 를 그대로 던진다', async () => {
    const { service } = fake({ save_my_invitation: { error: { message: 'PAID_EDIT_REQUIRED' } } });
    await expect(service.save(draft({ id: UUID }))).rejects.toThrow('PAID_EDIT_REQUIRED');
  });

  it('네트워크 오류는 던지고 빈 목록으로 삼키지 않는다', async () => {
    const { service } = fake({
      list_my_invitations: NETWORK,
      owner_list_guestbook: NETWORK,
      guest_list_guestbook: NETWORK,
    });
    await expect(service.list('u1')).rejects.toThrow('Network');
    await expect(service.listGuestbook(UUID)).rejects.toThrow('Network');
    await expect(service.listGuestbook(UUID, 'guest')).rejects.toThrow('Network');
  });

  it('get: 없으면 null, 네트워크 오류는 던지고, UUID 가 아닌 주소는 부르지 않고 null', async () => {
    const none = fake({ get_my_invitation: { data: null } });
    expect(await none.service.get(UUID)).toBeNull();
    expect(none.rpc).toHaveBeenCalledWith('get_my_invitation', { p_id: UUID });

    const down = fake({ get_my_invitation: NETWORK });
    await expect(down.service.get(UUID)).rejects.toThrow('Network');

    const local = fake();
    expect(await local.service.get('inv-local')).toBeNull();
    expect(local.rpc).not.toHaveBeenCalled();
  });

  it('이름 바꾸기·지우기·방명록 확인은 본인 RPC 로 간다', async () => {
    const { rpc, service } = fake({ rename_my_invitation: { data: draft({ id: UUID, name: '새 이름' }) } });
    expect((await service.rename(UUID, '새 이름')).name).toBe('새 이름');
    await service.remove(UUID);
    await service.markGuestbookSeen(UUID, '2026-11-04T00:00:00.000Z');
    expect(rpc.mock.calls).toEqual([
      ['rename_my_invitation', { p_id: UUID, p_name: '새 이름' }],
      ['remove_my_invitation', { p_id: UUID }],
      ['mark_guestbook_seen', { p_id: UUID, p_at: '2026-11-04T00:00:00.000Z' }],
    ]);
  });

  describe('applyOrder', () => {
    const order = { kind: 'activate', invitationId: UUID, extendDays: 30 } as const;

    it('주문을 그대로 보내고 바뀐 초대장을 돌려준다', async () => {
      const inv = draft({ id: UUID, slug: 'abcDEF123456' });
      const { rpc, service } = fake({ apply_invitation_order: { data: { ok: true, invitation: inv } } });
      expect(await service.applyOrder(order)).toEqual({ ok: true, invitation: inv });
      expect(rpc).toHaveBeenCalledWith('apply_invitation_order', { p_order: order });
    });

    it('거절은 reason 으로 돌려준다', async () => {
      const { service } = fake({ apply_invitation_order: { data: { ok: false, reason: 'blocked' } } });
      expect(await service.applyOrder(order)).toEqual({ ok: false, reason: 'blocked' });
    });

    it('정지·탈퇴 회원의 account_unavailable 은 예외로 던진다', async () => {
      const { service } = fake({ apply_invitation_order: { error: { message: 'account_unavailable' } } });
      await expect(service.applyOrder(order)).rejects.toThrow('account_unavailable');
    });
  });

  describe('getBySlug', () => {
    it('하객 응답에 없는 칸은 빈 값으로 채워 undefined 로 터지지 않게 한다', async () => {
      const { rpc, service } = fake({
        guest_invitation: {
          data: {
            state: 'active',
            invitation: {
              id: UUID,
              themeId: 'wedding',
              templateId: 'wedding-1',
              name: '우리 결혼',
              slug: 'abcDEF123456',
              linkThumb: null,
              banned: false,
              status: 'final',
              expiresAt: '2030-01-01T00:00:00.000Z',
              enabled: {},
              order: [],
              content: {},
              viewMode: 'story',
              paletteId: null,
              design: {},
            },
          },
        },
      });
      const r = await service.getBySlug('abcDEF123456');
      expect(rpc).toHaveBeenCalledWith('guest_invitation', { p_slug: 'abcDEF123456' });
      expect(r.state).toBe('active');
      expect(r.invitation).toMatchObject({ id: UUID, ownerId: '', number: '', completed: {}, createdAt: '', updatedAt: '' });
    });

    it('expired·not_found 는 초대장 없이 상태만 준다', async () => {
      expect(await fake({ guest_invitation: { data: { state: 'expired' } } }).service.getBySlug('s')).toEqual({ state: 'expired' });
      expect(await fake({ guest_invitation: { data: { state: 'not_found' } } }).service.getBySlug('s')).toEqual({
        state: 'not_found',
      });
    });

    it('네트워크 오류는 not_found 로 바꾸지 않고 던진다', async () => {
      await expect(fake({ guest_invitation: NETWORK }).service.getBySlug('s')).rejects.toThrow('Network');
    });
  });

  describe('방명록', () => {
    const input = { name: '하객', password: '1234', content: '축하해요' };
    const entry = { id: ENTRY, invitationId: UUID, name: '하객', content: '축하해요', createdAt: '2026-11-04T00:00:00.000Z' };

    it('만든 사람 목록과 하객 목록은 다른 RPC 다 (기본은 만든 사람)', async () => {
      const { rpc, service } = fake({ owner_list_guestbook: { data: [entry] }, guest_list_guestbook: { data: [] } });
      expect(await service.listGuestbook(UUID)).toEqual([entry]);
      expect(await service.listGuestbook(UUID, 'guest')).toEqual([]);
      expect(rpc.mock.calls).toEqual([
        ['owner_list_guestbook', { p_id: UUID }],
        ['guest_list_guestbook', { p_id: UUID }],
      ]);
    });

    it('쓰기 성공은 글을 돌려준다', async () => {
      const { rpc, service } = fake({ guest_add_guestbook: { data: { ok: true, entry } } });
      expect(await service.addGuestbook(UUID, input)).toEqual(entry);
      expect(rpc).toHaveBeenCalledWith('guest_add_guestbook', {
        p_id: UUID,
        p_name: '하객',
        p_password: '1234',
        p_content: '축하해요',
      });
    });

    it.each([
      ['invalid', 'INVALID'],
      ['closed', 'CLOSED'],
      ['not_found', 'NOT_FOUND'],
      ['rate_limited', 'RATE_LIMITED'],
    ])('쓰기가 {ok:false, reason:%s} 면 %s 로 던진다', async (reason, message) => {
      const { service } = fake({ guest_add_guestbook: { data: { ok: false, reason } } });
      await expect(service.addGuestbook(UUID, input)).rejects.toThrow(message);
    });

    it('지우기: 비밀번호는 하객 RPC, 작성자는 만든 사람 RPC', async () => {
      const { rpc, service } = fake({
        guest_remove_guestbook: { data: { ok: true } },
        owner_remove_guestbook: { data: { ok: true } },
      });
      expect(await service.removeGuestbook(UUID, ENTRY, { password: '1234' })).toBe('ok');
      expect(await service.removeGuestbook(UUID, ENTRY, { ownerId: 'u1' })).toBe('ok');
      expect(rpc.mock.calls).toEqual([
        ['guest_remove_guestbook', { p_id: UUID, p_entry: ENTRY, p_password: '1234' }],
        ['owner_remove_guestbook', { p_id: UUID, p_entry: ENTRY }],
      ]);
    });

    it.each(['wrong_password', 'not_found', 'rate_limited'] as const)('지우기 실패 %s 는 값으로 돌려준다', async (reason) => {
      const { service } = fake({ guest_remove_guestbook: { data: { ok: false, reason } } });
      expect(await service.removeGuestbook(UUID, ENTRY, { password: '1234' })).toBe(reason);
    });

    it('지우기 네트워크 오류는 던진다', async () => {
      const { service } = fake({ owner_remove_guestbook: NETWORK });
      await expect(service.removeGuestbook(UUID, ENTRY, { ownerId: 'u1' })).rejects.toThrow('Network');
    });
  });
});
