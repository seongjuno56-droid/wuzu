import { restoreSession, useSession } from '../session';

const user = {
  id: 'u1', email: null, name: '홍길동', provider: 'kakao' as const,
  marketingAgreed: false, createdAt: '2025-01-01T00:00:00.000Z', status: 'active' as const,
};

describe('session store', () => {
  it('starts logged out with unanswered push consent', () => {
    expect(useSession.getState().user).toBeNull();
    expect(useSession.getState().pushConsent).toBeNull();
  });
  it('sets and clears the user', () => {
    useSession.getState().setUser(user);
    expect(useSession.getState().user?.name).toBe('홍길동');
    useSession.getState().logout();
    expect(useSession.getState().user).toBeNull();
  });
  it('keeps push consent across logout', () => {
    useSession.getState().setPushConsent('agreed');
    useSession.getState().logout();
    expect(useSession.getState().pushConsent).toBe('agreed');
  });
});

describe('onboarding flag', () => {
  it('is set after a social signup and cleared once handled or on logout', () => {
    useSession.getState().setUser(user);
    useSession.getState().setNeedsOnboarding(true);
    expect(useSession.getState().needsOnboarding).toBe(true);
    useSession.getState().setNeedsOnboarding(false);
    expect(useSession.getState().needsOnboarding).toBe(false);
    useSession.getState().setNeedsOnboarding(true);
    useSession.getState().logout();
    expect(useSession.getState().needsOnboarding).toBe(false);
  });
});

describe('앱 시작 세션 복구', () => {
  const authWith = (currentUser: jest.Mock) => ({ currentUser, logout: jest.fn(async () => {}) });

  beforeEach(() => useSession.getState().setUser(user));

  it('currentUser() 가 null 이면 저장된 user 를 비우고 세션도 끊는다', async () => {
    const auth = authWith(jest.fn(async () => null));
    await restoreSession(auth);
    expect(useSession.getState().user).toBeNull();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
  it('회원 정보를 새로 읽어 바꾼다', async () => {
    const auth = authWith(jest.fn(async () => ({ ...user, name: '새이름' })));
    await restoreSession(auth);
    expect(useSession.getState().user?.name).toBe('새이름');
    expect(auth.logout).not.toHaveBeenCalled();
  });
  it('탈퇴 신청 상태면 로그아웃으로 본다', async () => {
    const auth = authWith(jest.fn(async () => ({ ...user, status: 'withdrawing' as const })));
    await restoreSession(auth);
    expect(useSession.getState().user).toBeNull();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
  it('네트워크 오류면 저장된 user 를 그대로 둔다', async () => {
    const auth = authWith(jest.fn(async () => { throw new Error('network'); }));
    await restoreSession(auth);
    expect(useSession.getState().user?.id).toBe('u1');
    expect(auth.logout).not.toHaveBeenCalled();
  });
  it('확인하는 사이 새로 로그인했으면 그 회원을 지우거나 세션을 끊지 않는다', async () => {
    const fresh = { ...user, id: 'u2', name: '새로그인' };
    const auth = authWith(
      jest.fn(async () => {
        // currentUser 가 끝나기 전에 로그인 화면에서 새로 로그인
        useSession.getState().setUser(fresh);
        return null;
      }),
    );
    await restoreSession(auth);
    expect(useSession.getState().user?.id).toBe('u2');
    expect(auth.logout).not.toHaveBeenCalled();
  });
  it('확인하는 사이 새로 로그인했으면 예전 결과로 덮어쓰지 않는다', async () => {
    const fresh = { ...user, id: 'u2', name: '새로그인' };
    const auth = authWith(
      jest.fn(async () => {
        useSession.getState().setUser(fresh);
        return { ...user, name: '예전회원' };
      }),
    );
    await restoreSession(auth);
    expect(useSession.getState().user?.name).toBe('새로그인');
  });
  it('세션 끊기가 실패해도 저장된 user 는 비운다', async () => {
    const auth = { currentUser: jest.fn(async () => null), logout: jest.fn(async () => { throw new Error('x'); }) };
    await restoreSession(auth);
    expect(useSession.getState().user).toBeNull();
  });
});
