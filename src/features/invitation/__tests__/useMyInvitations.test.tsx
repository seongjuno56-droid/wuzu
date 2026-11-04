import { act, create } from 'react-test-renderer';

import { toast } from '../../../components/Toast';
import { invitationService } from '../../../services';
import { useMyInvitations } from '../useMyInvitations';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (fn: () => void) => useEffect(fn, [fn]) };
});
jest.mock('../../../components/Toast', () => ({ toast: jest.fn() }));
jest.mock('../../../store/session', () => ({
  useSession: (pick: (s: { user: { id: string } }) => unknown) => pick({ user: { id: 'u1' } }),
}));
jest.mock('../../../services', () => ({ invitationService: { list: jest.fn() } }));

const list = invitationService.list as jest.Mock;

function mount() {
  const seen: { current?: ReturnType<typeof useMyInvitations> } = {};
  const Probe = () => {
    seen.current = useMyInvitations();
    return null;
  };
  return { seen, Probe };
}

describe('useMyInvitations 새로고침 실패', () => {
  beforeEach(() => {
    list.mockReset();
    (toast as jest.Mock).mockClear();
  });

  it('새로고침이 실패해도 보이던 목록을 지우지 않고 안내만 한다', async () => {
    const before = [{ id: 'a', status: 'draft' }];
    list.mockResolvedValueOnce(before);
    const { seen, Probe } = mount();
    await act(async () => {
      create(<Probe />);
    });
    expect(seen.current?.list).toEqual(before);

    list.mockRejectedValueOnce(new Error('Network request failed'));
    await act(async () => {
      await seen.current?.reload();
    });
    expect(seen.current?.list).toEqual(before);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('처음 불러오기가 실패하면 빈 목록으로 보이지 않고 불러오는 중(null)으로 남는다', async () => {
    list.mockRejectedValueOnce(new Error('Network request failed'));
    const { seen, Probe } = mount();
    await act(async () => {
      create(<Probe />);
    });
    expect(seen.current?.list).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
  });
});
