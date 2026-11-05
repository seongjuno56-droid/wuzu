import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import GuestbookManage from '../../../app/invitation/[id]/guestbook';
import RsvpManage from '../../../app/invitation/[id]/rsvp';
import InvitationScreen from '../../../app/invite/[id]';
import { AppModal } from '../../../components/AppModal';
import { LoadFailed } from '../../../components/LoadFailed';
import { toast } from '../../../components/Toast';
import { invitationService, notificationService, rsvpService } from '../../../services';
import { RsvpFormModal } from '../../rsvp/RsvpFormModal';
import { PurchaseScreen } from '../../wallet/PurchaseScreen';
import { SaveNameModal } from '../editor/SaveModals';
import { GuestbookModals } from '../GuestbookModals';
import { createInvitation } from '../themes';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useLocalSearchParams: () => ({ id: 'i1' }),
    useFocusEffect: (fn: () => void) => useEffect(fn, [fn]),
    router: { back: jest.fn(), push: jest.fn() },
  };
});
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));
jest.mock('../../../store/session', () => ({
  useSession: (pick: (s: { user: { id: string } }) => unknown) => pick({ user: { id: 'u2' } }),
}));
jest.mock('../view/InvitationView', () => ({ InvitationView: () => null }));
jest.mock('../../wallet/usePurchaseFlow', () => ({
  usePurchaseFlow: () => ({ ask: jest.fn(), run: jest.fn(), busy: false, modals: null, lack: jest.fn() }),
}));
jest.mock('../../wallet/useWallet', () => {
  const state = { balance: 100, refresh: jest.fn(async () => {}) };
  return { useWallet: (pick: (s: typeof state) => unknown) => pick(state) };
});
jest.mock('../../../services', () => ({
  invitationService: {
    get: jest.fn(),
    listGuestbook: jest.fn(),
    removeGuestbook: jest.fn(),
    markGuestbookSeen: jest.fn(async () => {}),
  },
  rsvpService: { list: jest.fn(), get: jest.fn(), submit: jest.fn(), addManual: jest.fn() },
  usingMockAuth: true,
  notificationService: { add: jest.fn() },
}));
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => m.get(k) ?? null,
      setItem: async (k: string, v: string) => void m.set(k, v),
    },
  };
});

const get = invitationService.get as jest.Mock;
const listGuestbook = invitationService.listGuestbook as jest.Mock;
const removeGuestbook = invitationService.removeGuestbook as jest.Mock;
const markSeen = invitationService.markGuestbookSeen as jest.Mock;
const rsvpList = rsvpService.list as jest.Mock;
const submit = rsvpService.submit as jest.Mock;
const notify = notificationService.add as jest.Mock;

const DOWN = new Error('Network request failed');
const entry = { id: 'e1', invitationId: 'i1', name: '하객', content: '축하해요', createdAt: '2026-11-04T00:00:00.000Z' };
const corporate = () => ({
  ...createInvitation({ id: 'i1', ownerId: 'u1', themeId: 'corporate', templateId: 't' }),
  name: '행사',
  status: 'final' as const,
  enabled: { rsvp: true },
  expiresAt: '2099-01-01T00:00:00.000Z',
});

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(element);
  });
  return tree;
}
const retry = (tree: ReactTestRenderer) => act(async () => tree.root.findByType(LoadFailed).props.onRetry());
const hasFailed = (tree: ReactTestRenderer) => tree.root.findAllByType(LoadFailed).length > 0;
const texts = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === 'string' ? c : texts(c))).join('');
const toasts = () => (toast as jest.Mock).mock.calls.map((c) => c[0]);

beforeEach(() => {
  jest.clearAllMocks();
  get.mockReset();
  listGuestbook.mockReset();
  removeGuestbook.mockReset();
  rsvpList.mockReset();
  submit.mockReset();
  notify.mockReset();
  markSeen.mockImplementation(async () => {});
});

describe('저장 중 취소', () => {
  const modal = (saving: boolean, onCancel: () => void) =>
    render(<SaveNameModal visible kind="draft" initialName="이름" saving={saving} onCancel={onCancel} onSave={() => {}} />);

  it('저장 중에는 취소·바깥 누르기로 닫히지 않는다', async () => {
    const onCancel = jest.fn();
    const tree = await modal(true, onCancel);
    const props = tree.root.findByType(AppModal).props;
    props.onDismiss();
    props.actions[0].onPress();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('저장 중이 아니면 닫힌다', async () => {
    const onCancel = jest.fn();
    const tree = await modal(false, onCancel);
    tree.root.findByType(AppModal).props.onDismiss();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('방명록 관리 화면', () => {
  it('처음 불러오기 실패는 다시 시도 화면이고, 다시 시도하면 목록이 나온다', async () => {
    get.mockResolvedValue(corporate());
    listGuestbook.mockRejectedValueOnce(DOWN);
    const tree = await render(<GuestbookManage />);
    expect(hasFailed(tree)).toBe(true);
    listGuestbook.mockResolvedValueOnce([entry]);
    await retry(tree);
    expect(hasFailed(tree)).toBe(false);
    expect(texts(tree.root)).toContain('축하해요');
  });

  it('초대장 읽기가 실패해도 다시 시도 화면이다 (모두 신규로 보이지 않게)', async () => {
    get.mockRejectedValueOnce(DOWN);
    listGuestbook.mockResolvedValue([entry]);
    const tree = await render(<GuestbookManage />);
    expect(hasFailed(tree)).toBe(true);
  });

  it('불러오지 못하고 나가면 확인 시각을 보내지 않는다', async () => {
    get.mockResolvedValue(corporate());
    listGuestbook.mockRejectedValue(DOWN);
    const tree = await render(<GuestbookManage />);
    await act(async () => tree.unmount());
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('불러온 뒤 나가면 확인 시각을 보낸다', async () => {
    get.mockResolvedValue(corporate());
    listGuestbook.mockResolvedValue([entry]);
    const tree = await render(<GuestbookManage />);
    await act(async () => tree.unmount());
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('이미 지워진 글을 지우면 전용 안내 뒤 목록을 새로 읽는다', async () => {
    get.mockResolvedValue(corporate());
    listGuestbook.mockResolvedValue([entry]);
    removeGuestbook.mockResolvedValue('not_found');
    const tree = await render(<GuestbookManage />);
    const removeBtn = tree.root.findAll((n) => n.props.accessibilityLabel === '하객 방명록 삭제' && !!n.props.onPress)[0];
    await act(async () => removeBtn.props.onPress());
    listGuestbook.mockResolvedValue([]);
    const modal = tree.root.findAllByType(AppModal).find((m) => m.props.visible)!;
    await act(async () => modal.props.actions[1].onPress());
    expect(toasts()).toContain('이미 삭제된 글이에요.');
    expect(toasts()).not.toContain('삭제가 완료되었습니다.');
    expect(texts(tree.root)).not.toContain('축하해요');
  });
});

describe('참석 응답 명단 화면', () => {
  it('처음 불러오기 실패는 다시 시도 화면이고 응답 폼을 열 수 없다', async () => {
    get.mockRejectedValueOnce(DOWN);
    const tree = await render(<RsvpManage />);
    expect(hasFailed(tree)).toBe(true);
    expect(tree.root.findAllByType(RsvpFormModal)).toHaveLength(0);
    expect(texts(tree.root)).not.toContain('응답 추가');

    get.mockResolvedValueOnce(corporate());
    rsvpList.mockResolvedValueOnce([]);
    await retry(tree);
    expect(hasFailed(tree)).toBe(false);
    expect(tree.root.findByType(RsvpFormModal).props.themeId).toBe('corporate');
  });

  it('초대장은 읽고 명단만 실패해도 다시 시도 화면이다', async () => {
    get.mockResolvedValueOnce(corporate());
    rsvpList.mockRejectedValueOnce(DOWN);
    const tree = await render(<RsvpManage />);
    expect(hasFailed(tree)).toBe(true);
  });

  it('없는 초대장이면 추가·고치기를 막는다', async () => {
    get.mockResolvedValueOnce(null);
    const tree = await render(<RsvpManage />);
    expect(tree.root.findAllByType(RsvpFormModal)).toHaveLength(0);
    expect(texts(tree.root)).toContain('초대장을 찾을 수 없어요.');
    expect(rsvpList).not.toHaveBeenCalled();
  });
});

describe('구매 화면', () => {
  it('처음 불러오기 실패는 다시 시도 화면이고, 다시 시도하면 구매 화면이 나온다', async () => {
    get.mockRejectedValueOnce(DOWN);
    const tree = await render(<PurchaseScreen mode="activate" invitationId="i1" />);
    expect(hasFailed(tree)).toBe(true);
    get.mockResolvedValueOnce(corporate());
    await retry(tree);
    expect(hasFailed(tree)).toBe(false);
    expect(texts(tree.root)).toContain('행사');
  });
});

describe('하객 화면', () => {
  const input = { name: '홍길동', attending: true, org: '우주', phone: '010-1234-5678', companions: 0 };
  const response = { ...input, id: 'r-new', invitationId: 'i1', source: 'guest', createdAt: 'c', updatedAt: 'u' };

  async function open() {
    get.mockResolvedValue(corporate());
    listGuestbook.mockResolvedValue([entry]);
    return render(<InvitationScreen />);
  }

  it('서버 제출 성공 뒤 알림이 실패해도 성공으로 끝난다 (다시 보내 응답이 겹치지 않게)', async () => {
    submit.mockResolvedValue({ ok: true, response, token: 'tok', created: true });
    notify.mockRejectedValue(new Error('알림 실패'));
    const tree = await open();
    let result: unknown;
    await act(async () => {
      result = await tree.root.findByType(RsvpFormModal).props.onSubmit(input);
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(result).toBe('ok');
    expect(toasts()).toContain('응답을 보냈어요');
  });

  it('이미 지워진 글을 지우면 목록을 새로 읽는다', async () => {
    removeGuestbook.mockResolvedValue('not_found');
    const tree = await open();
    listGuestbook.mockClear();
    let result: unknown;
    await act(async () => {
      result = await tree.root.findByType(GuestbookModals).props.onRemove(entry, '1234');
    });
    expect(result).toBe('not_found');
    expect(listGuestbook).toHaveBeenCalledTimes(1);
  });
});

describe('방명록 전체보기 삭제', () => {
  async function removeWith(result: string) {
    const onRemove = jest.fn(async () => result);
    const tree = await render(
      <GuestbookModals view="all" onChangeView={() => {}} entries={[entry]} isOwner onAdd={async () => {}} onRemove={onRemove as never} />,
    );
    const btn = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === '하객님의 방명록 삭제')[0];
    await act(async () => btn.props.onPress());
    const modal = tree.root.findAllByType(AppModal).find((m) => m.props.visible)!;
    await act(async () => modal.props.actions[modal.props.actions.length - 1].onPress());
    expect(onRemove).toHaveBeenCalledTimes(1);
  }

  it('not_found 는 삭제 완료라고 하지 않는다', async () => {
    await removeWith('not_found');
    expect(toasts()).toContain('이미 삭제된 글이에요.');
    expect(toasts()).not.toContain('삭제가 완료되었습니다.');
  });

  it('성공하면 삭제 완료 안내', async () => {
    await removeWith('ok');
    expect(toasts()).toContain('삭제가 완료되었습니다.');
  });
});
