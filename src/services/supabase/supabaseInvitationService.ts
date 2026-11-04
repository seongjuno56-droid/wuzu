import type { SupabaseClient } from '@supabase/supabase-js';

import type { Invitation } from '../../features/invitation/model';
import type { GuestbookEntry, InvitationService } from '../types';
import { rpcCaller } from './rpc';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 서버가 준 id 인지. 저장 전 초안의 기기 임시 id(inv-...)는 아니다 */
const isServerId = (id: string) => UUID_RE.test(id);

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
    list: () => call<Invitation[]>('list_my_invitations'),

    async get(id) {
      // 주소로 들어온 잘못된 id 를 보내면 uuid 변환 오류가 난다. 없는 초대장과 같다
      if (!isServerId(id)) return null;
      return call<Invitation | null>('get_my_invitation', { p_id: id });
    },

    save: (invitation) =>
      call<Invitation>('save_my_invitation', {
        p_id: isServerId(invitation.id) ? invitation.id : null,
        p_data: invitation,
      }),

    async remove(id) {
      await call('remove_my_invitation', { p_id: id });
    },

    rename: (id, name) => call<Invitation>('rename_my_invitation', { p_id: id, p_name: name }),

    async markGuestbookSeen(id, at) {
      await call('mark_guestbook_seen', { p_id: id, p_at: at });
    },

    applyOrder: (order) => call('apply_invitation_order', { p_order: order }),

    async getBySlug(slug) {
      const r = await call<{ state: 'active' | 'expired' | 'not_found'; invitation?: GuestInvitation }>('guest_invitation', {
        p_slug: slug,
      });
      return r.invitation ? { state: r.state, invitation: fromGuest(r.invitation) } : { state: r.state };
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
