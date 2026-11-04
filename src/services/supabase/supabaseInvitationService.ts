import type { SupabaseClient } from '@supabase/supabase-js';

import type { Invitation } from '../../features/invitation/model';
import type { GuestbookEntry, InvitationService } from '../types';
import { collectLocalMedia, isServerId, mapInvitationMedia } from '../media/localMedia';
import { fromMediaRef, toMediaRef } from '../media/mediaRef';
import { withTimeout } from '../withTimeout';
import { rpcCaller } from './rpc';

/** 저장은 모달을 닫을 수 없는 동안 돈다. 멈춘 요청도 이 시간 뒤에는 다시 시도할 수 있는 실패로 끝난다 */
export const SAVE_TIMEOUT_MS = 30_000;

/** 서버 값(r2://키) → 앱 값(공개 주소) */
const fromServer = (inv: Invitation) => mapInvitationMedia(inv, fromMediaRef);

/** 앱 값 → 서버 값. 기기 주소는 하객이 볼 수 없는 값이므로 서버에 보내지 않고 던진다(먼저 uploadDraftMedia 를 거쳐야 한다) */
function toServer(inv: Invitation): Invitation {
  if (collectLocalMedia(inv).length > 0) throw new Error('LOCAL_MEDIA');
  return mapInvitationMedia(inv, toMediaRef);
}

type GuestInvitation = Omit<Invitation, 'ownerId' | 'number' | 'completed' | 'createdAt' | 'updatedAt'>;

/** 하객 응답에 빠지는 만든 사람 전용 칸을 빈 값으로 채운다 */
const fromGuest = (raw: GuestInvitation): Invitation => ({
  ownerId: '',
  number: '',
  completed: {},
  createdAt: '',
  updatedAt: '',
  ...raw,
});

type GuestWriteReason = 'not_found' | 'closed' | 'invalid' | 'rate_limited';
type GuestRemoveReason = 'wrong_password' | 'not_found' | 'rate_limited';

/**
 * Supabase 초대장·방명록. 표에는 닿지 않고 RPC 만 쓴다.
 * 오류는 모두 던진다(빈 목록·null 로 바꾸지 않는다): 화면이 보이던 값을 지키고 안내할지 정한다.
 * 번호·작성자·기간은 서버 값이다. 초안의 기기 값을 보내도 서버는 읽지 않는다.
 */
export function createSupabaseInvitationService(client: SupabaseClient): InvitationService {
  const call = rpcCaller(client);

  return {
    list: async () => (await call<Invitation[]>('list_my_invitations')).map(fromServer),

    async get(id) {
      // 주소로 들어온 잘못된 id 를 보내면 uuid 변환 오류가 난다. 없는 초대장과 같다
      if (!isServerId(id)) return null;
      const inv = await call<Invitation | null>('get_my_invitation', { p_id: id });
      return inv && fromServer(inv);
    },

    async save(invitation) {
      const data = toServer(invitation);
      const saved = await withTimeout(
        () =>
          call<Invitation>('save_my_invitation', {
            p_id: isServerId(invitation.id) ? invitation.id : null,
            p_data: data,
          }),
        SAVE_TIMEOUT_MS,
      );
      return fromServer(saved);
    },

    async remove(id) {
      await call('remove_my_invitation', { p_id: id });
    },

    rename: async (id, name) => fromServer(await call<Invitation>('rename_my_invitation', { p_id: id, p_name: name })),

    async markGuestbookSeen(id, at) {
      await call('mark_guestbook_seen', { p_id: id, p_at: at });
    },

    async applyOrder(order) {
      type Result = Awaited<ReturnType<InvitationService['applyOrder']>>;
      let r: Result;
      if (order.kind === 'edit') {
        // 수정 주문만 내용을 저장한다. 활성화·연장은 파일을 싣지 않는다
        const p_order = { ...order, invitation: toServer(order.invitation) };
        r = await withTimeout(() => call<Result>('apply_invitation_order', { p_order }), SAVE_TIMEOUT_MS);
      } else {
        r = await call<Result>('apply_invitation_order', { p_order: order });
      }
      return r.ok ? { ok: true, invitation: fromServer(r.invitation) } : r;
    },

    async getBySlug(slug) {
      const r = await call<{ state: 'active' | 'expired' | 'not_found'; invitation?: GuestInvitation }>('guest_invitation', {
        p_slug: slug,
      });
      return r.invitation ? { state: r.state, invitation: fromServer(fromGuest(r.invitation)) } : { state: r.state };
    },

    listGuestbook: (invitationId, as = 'owner') =>
      call<GuestbookEntry[]>(as === 'guest' ? 'guest_list_guestbook' : 'owner_list_guestbook', { p_id: invitationId }),

    async addGuestbook(invitationId, input) {
      const r = await call<{ ok: true; entry: GuestbookEntry } | { ok: false; reason: GuestWriteReason }>('guest_add_guestbook', {
        p_id: invitationId,
        p_name: input.name,
        p_password: input.password,
        p_content: input.content,
      });
      if (!r.ok) throw new Error(r.reason.toUpperCase());
      return r.entry;
    },

    async removeGuestbook(invitationId, entryId, auth) {
      const r =
        'ownerId' in auth
          ? await call<{ ok: true } | { ok: false; reason: 'not_found' }>('owner_remove_guestbook', {
              p_id: invitationId,
              p_entry: entryId,
            })
          : await call<{ ok: true } | { ok: false; reason: GuestRemoveReason }>('guest_remove_guestbook', {
              p_id: invitationId,
              p_entry: entryId,
              p_password: auth.password,
            });
      return r.ok ? 'ok' : r.reason;
    },
  };
}
