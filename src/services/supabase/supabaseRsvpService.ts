import type { SupabaseClient } from '@supabase/supabase-js';

import type { RsvpResponse } from '../../features/rsvp/rsvp';
import type { RsvpService, RsvpSubmitResult } from '../types';
import { rpcCaller } from './rpc';

/**
 * Supabase 참석 응답. 마감·테마는 서버가 표에서 읽으므로 themeId·deadline 은 보내지 않는다.
 * 하객 토큰이 주소에 남지 않도록 RPC 는 언제나 POST 로 부른다(rpc.ts).
 */
export function createSupabaseRsvpService(client: SupabaseClient): RsvpService {
  const call = rpcCaller(client);

  return {
    list: (invitationId) => call<RsvpResponse[]>('owner_rsvp_list', { p_id: invitationId }),

    async get(invitationId, id, token) {
      if (!token) return null;
      return call<RsvpResponse | null>('guest_rsvp_get', { p_id: invitationId, p_response: id, p_token: token });
    },

    submit: ({ invitationId, input, id, token }) =>
      call<RsvpSubmitResult>('guest_rsvp_submit', {
        p_id: invitationId,
        p_input: input,
        p_response: id ?? null,
        p_token: token ?? null,
      }),

    addManual: (invitationId, _themeId, input) => call<RsvpResponse>('owner_rsvp_add', { p_id: invitationId, p_input: input }),

    update: (invitationId, _themeId, id, input) =>
      call<RsvpResponse>('owner_rsvp_update', { p_id: invitationId, p_response: id, p_input: input }),

    async remove(invitationId, id) {
      await call('owner_rsvp_remove', { p_id: invitationId, p_response: id });
    },
  };
}
