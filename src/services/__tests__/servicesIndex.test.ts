/** 환경 변수가 있으면 초대장·응답 서비스가 Supabase 로 간다 */
const mockRpc = jest.fn(async (_fn: string, _args?: unknown) => ({ data: [] as unknown, error: null }));

jest.mock('../supabase/client', () => ({ createSupabaseClient: jest.fn(() => ({ rpc: mockRpc })) }));
jest.mock('../supabase/supabaseAuthService', () => ({ createSupabaseAuthService: jest.fn(() => ({})) }));
jest.mock('../supabase/authStorage', () => ({ clearAuthStorage: jest.fn() }));

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  mockRpc.mockClear();
  jest.resetModules();
});

it('환경 변수가 있으면 Supabase RPC 를 부르고, 지갑의 주문도 서버로 간다', async () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  const { invitationService, rsvpService, walletService, usingMockAuth } = jest.requireActual('../index');
  expect(usingMockAuth).toBe(false);
  await invitationService.list('u1');
  await rsvpService.list('i');
  mockRpc.mockResolvedValueOnce({ data: { ok: false, reason: 'not_found' }, error: null });
  expect(await walletService.spend('u1', { kind: 'activate', invitationId: 'i', extendDays: 0 })).toEqual({
    ok: false,
    reason: 'not_found',
  });
  expect(mockRpc.mock.calls.map((c) => c[0])).toEqual(['list_my_invitations', 'owner_rsvp_list', 'apply_invitation_order']);
});

it('환경 변수가 없으면 mock 이고 RPC 를 부르지 않는다', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const { invitationService, usingMockAuth } = jest.requireActual('../index');
  expect(usingMockAuth).toBe(true);
  expect(await invitationService.list('u1')).toEqual([]);
  expect(mockRpc).not.toHaveBeenCalled();
});
