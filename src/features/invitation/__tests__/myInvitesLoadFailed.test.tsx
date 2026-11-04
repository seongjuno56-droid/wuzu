import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import MyInvites from '../../../app/(tabs)/my-invites';
import { LoadFailed } from '../../../components/LoadFailed';
import { useMyInvitations } from '../useMyInvitations';

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { navigate: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../../../store/session', () => ({
  useSession: (pick: (s: { user: { id: string } }) => unknown) => pick({ user: { id: 'u1' } }),
}));
jest.mock('../../../components/LetterBadge', () => ({ LetterBadge: () => null }));
jest.mock('../useMyInvitations', () => ({ useMyInvitations: jest.fn() }));
jest.mock('../../../services', () => ({
  invitationService: { listGuestbook: jest.fn(), remove: jest.fn() },
  rsvpService: { list: jest.fn() },
}));

async function render() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MyInvites />);
  });
  return tree;
}

it('처음 불러오기가 실패하면 다시 시도 화면이고 버튼이 reload 를 부른다', async () => {
  const reload = jest.fn();
  (useMyInvitations as jest.Mock).mockReturnValue({ list: null, failed: true, reload });
  const tree = await render();
  tree.root.findByType(LoadFailed).props.onRetry();
  expect(reload).toHaveBeenCalledTimes(1);
});

it('불러오는 중에는 다시 시도 화면이 없다', async () => {
  (useMyInvitations as jest.Mock).mockReturnValue({ list: null, failed: false, reload: jest.fn() });
  const tree = await render();
  expect(tree.root.findAllByType(LoadFailed)).toHaveLength(0);
});
