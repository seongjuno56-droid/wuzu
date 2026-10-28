jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useSession } from '../session';
import { useSignupDraft } from '../signupDraft';

const user = {
  id: 'u1', email: 'a@b.kr', name: '홍길동', provider: 'email' as const,
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

describe('signup draft', () => {
  it('merges patches and resets', () => {
    useSignupDraft.getState().patch({ name: '김', provider: 'email' });
    useSignupDraft.getState().patch({ email: 'x@y.kr' });
    expect(useSignupDraft.getState().draft).toMatchObject({ name: '김', email: 'x@y.kr', provider: 'email' });
    useSignupDraft.getState().reset();
    expect(useSignupDraft.getState().draft.name).toBeUndefined();
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
