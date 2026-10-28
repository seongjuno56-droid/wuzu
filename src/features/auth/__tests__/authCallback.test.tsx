import AuthCallback from '../../../app/auth/callback';
import { render } from '../../../test/ui';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router') as { router: Record<string, jest.Mock> };

beforeEach(() => jest.clearAllMocks());

describe('OAuth 복귀 경로 (/auth/callback)', () => {
  it('뒤에 화면(로그인)이 있으면 그쪽으로 돌아가고 아무것도 그리지 않는다', () => {
    const ui = render(<AuthCallback />);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(ui.queryText('Unmatched Route')).toBeNull();
  });

  it('뒤에 화면이 없으면(앱이 이 주소로 처음 열림) 홈으로 바꾼다', () => {
    router.canGoBack.mockReturnValueOnce(false);
    render(<AuthCallback />);
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(router.back).not.toHaveBeenCalled();
  });
});
