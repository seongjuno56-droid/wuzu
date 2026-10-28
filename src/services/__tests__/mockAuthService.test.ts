import { createMockAuthService, MOCK_SOCIAL_KEYS } from '../mock/mockAuthService';
import { KeyValueStorage } from '../types';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}

let storage: KeyValueStorage;
let svc: ReturnType<typeof createMockAuthService>;
beforeEach(() => {
  storage = memoryStorage();
  svc = createMockAuthService({ delayMs: 0, storage });
});

async function loginActive() {
  const r = await svc.socialLogin('kakao');
  if (!r.ok) throw new Error('로그인 실패');
  return r.user;
}

describe('socialLogin', () => {
  it('카카오: 정상 시드 계정으로 로그인 (신규 아님)', async () => {
    const r = await svc.socialLogin('kakao');
    expect(r).toMatchObject({ ok: true, isNew: false, user: { id: 'u-test', provider: 'kakao' } });
  });
  it('구글: 첫 로그인은 계정을 만들고 isNew, 두 번째는 같은 계정으로 isNew 아님', async () => {
    const first = await svc.socialLogin('google');
    if (!first.ok) throw new Error('로그인 실패');
    expect(first.isNew).toBe(true);
    expect(first.user.provider).toBe('google');
    expect(first.user.loginId).toMatch(/^go_[a-z0-9]{8}$/);
    const second = await svc.socialLogin('google');
    expect(second).toMatchObject({ ok: true, isNew: false, user: { id: first.user.id } });
  });
  it('정지 시드 → banned', async () => {
    svc = createMockAuthService({ delayMs: 0, storage, socialKeys: { kakao: MOCK_SOCIAL_KEYS.banned } });
    expect(await svc.socialLogin('kakao')).toEqual({ ok: false, reason: 'banned' });
    expect(await svc.currentUser()).toBeNull();
  });
  it('탈퇴 신청 시드 → withdrawing, 철회 기한은 30일', async () => {
    svc = createMockAuthService({ delayMs: 0, storage, socialKeys: { kakao: MOCK_SOCIAL_KEYS.withdrawing } });
    const r = await svc.socialLogin('kakao');
    if (r.ok || r.reason !== 'withdrawing') throw new Error('철회 안내가 아님');
    expect(r.userId).toBe('u-leaving');
    expect((Date.parse(r.cancelDeadline) - Date.parse(r.requestedAt)) / 86400000).toBe(30);
    const user = await svc.cancelWithdraw(r.userId);
    expect(user.status).toBe('active');
    expect(await svc.socialLogin('kakao')).toMatchObject({ ok: true });
  });
});

describe('currentUser / logout', () => {
  it('로그인 전에는 null, 로그인하면 마지막 회원, 로그아웃하면 null', async () => {
    expect(await svc.currentUser()).toBeNull();
    const user = await loginActive();
    expect((await svc.currentUser())?.id).toBe(user.id);
    // 같은 저장소로 다시 만들어도(앱 재시작) 유지
    const again = createMockAuthService({ delayMs: 0, storage });
    expect((await again.currentUser())?.id).toBe(user.id);
    await svc.logout();
    expect(await svc.currentUser()).toBeNull();
  });
});

describe('updateProfile', () => {
  it('추가 정보를 저장한다', async () => {
    const user = await loginActive();
    const updated = await svc.updateProfile(user.id, { birth: '1990-05-05', gender: 'female', marketingAgreed: false });
    expect(updated).toMatchObject({ birth: '1990-05-05', gender: 'female', marketingAgreed: false });
    expect((await svc.currentUser())?.gender).toBe('female');
  });
  it('undefined 면 비운다 (다음에 하기)', async () => {
    const user = await loginActive();
    const updated = await svc.updateProfile(user.id, { birth: undefined, gender: undefined, marketingAgreed: false });
    expect(updated.birth).toBeUndefined();
    expect(updated.gender).toBeUndefined();
  });
});

describe('계정 관리', () => {
  it('회원정보 수정: 이름·생년월일·성별과 수정일 저장', async () => {
    const user = await loginActive();
    const u = await svc.updateAccount(user.id, { name: '새이름', birth: undefined, gender: 'female' });
    expect(u.name).toBe('새이름');
    expect(u.birth).toBeUndefined();
    expect(u.gender).toBe('female');
    expect(u.profileUpdatedAt).toBeDefined();
  });
  it('마케팅 동의 변경과 수정일', async () => {
    const user = await loginActive();
    const u = await svc.setMarketing(user.id, false);
    expect(u.marketingAgreed).toBe(false);
    expect(u.marketingUpdatedAt).toBeDefined();
  });
  it('탈퇴 신청 후 다시 로그인하면 철회 안내(30일 기한)', async () => {
    const user = await loginActive();
    await svc.requestWithdraw(user.id);
    const again = await svc.socialLogin('kakao');
    if (again.ok || again.reason !== 'withdrawing') throw new Error('철회 안내가 아님');
    const days = (Date.parse(again.cancelDeadline) - Date.parse(again.requestedAt)) / 86400000;
    expect(days).toBe(30);
  });
  it('시드 계정은 ka_ 아이디를 쓴다', async () => {
    const user = await loginActive();
    expect(user.loginId).toMatch(/^ka_[a-z0-9]{8}$/);
  });
});
