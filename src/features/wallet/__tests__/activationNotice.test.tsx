import { router } from 'expo-router';
import { Modal, Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { AppModal } from '../../../components/AppModal';
import { toast } from '../../../components/Toast';
import { invitationService, walletService } from '../../../services';
import type { Invitation } from '../../invitation/model';
import { createInvitation } from '../../invitation/themes';
import { shareInvitation } from '../../my-invites/share';
import { PurchaseScreen } from '../PurchaseScreen';
import { useWallet } from '../useWallet';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (fn: () => void) => useEffect(fn, [fn]),
    router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() },
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));
jest.mock('../../../store/session', () => {
  const state = { user: { id: 'u1' } };
  const useSession = (pick: (s: typeof state) => unknown) => pick(state);
  useSession.getState = () => state;
  return { useSession };
});
jest.mock('../../../services', () => ({
  invitationService: { get: jest.fn() },
  walletService: { spend: jest.fn(), balance: jest.fn(async () => 500) },
  mediaUploader: null,
}));
jest.mock('../confirm', () => ({ confirmWithBiometrics: jest.fn(async () => true) }));
jest.mock('../../my-invites/share', () => ({ shareInvitation: jest.fn(async () => {}) }));

const get = invitationService.get as jest.Mock;
const spend = walletService.spend as jest.Mock;
const share = shareInvitation as jest.Mock;
const TITLE = '초대장이 완성되었습니다.';
const DAY = 86400000;
const realOs = Platform.OS;
const setPlatform = (os: string) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const textOf = (n: ReactTestInstance): string =>
  n.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');

const base = (over: Partial<Invitation> = {}): Invitation => ({
  ...createInvitation({ id: 'i1', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }),
  name: '우리 결혼합니다',
  status: 'final',
  ...over,
});
const expired = () =>
  base({
    activatedAt: new Date(Date.now() - 40 * DAY).toISOString(),
    expiresAt: new Date(Date.now() - DAY).toISOString(),
    slug: 'old',
  });
const running = () =>
  base({
    activatedAt: new Date(Date.now() - DAY).toISOString(),
    expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
    slug: 'old',
  });

async function open(mode: 'activate' | 'extend', current: Invitation) {
  get.mockResolvedValue(current);
  spend.mockResolvedValue({ ok: true, balance: 400, invitation: { ...current, slug: current.slug ?? 'abc123' } });
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<PurchaseScreen mode={mode} invitationId="i1" />);
  });
  return tree;
}
const pressable = (tree: ReactTestRenderer, label: string) => {
  let cur: ReactTestInstance | null =
    tree.root.findAll((n) => (n.type as unknown) === 'Text' && textOf(n) === label).pop() ?? null;
  while (cur && typeof cur.props.onPress !== 'function') cur = cur.parent;
  if (!cur) throw new Error(/* i18n-ignore */ `버튼 없음: ${label}`);
  return cur;
};
const tap = (tree: ReactTestRenderer, label: string) => act(async () => pressable(tree, label).props.onPress());
const hasText = (tree: ReactTestRenderer, text: string) =>
  tree.root.findAll((n) => (n.type as unknown) === 'Text' && textOf(n) === text).length > 0;
const notice = (tree: ReactTestRenderer) => tree.root.findAll((n) => n.type === AppModal && n.props.title === TITLE)[0];

/** 구매 버튼 → 확인 모달 → 인증·차감까지 */
async function buy(tree: ReactTestRenderer) {
  await tap(tree, '레터로 구매하기');
  await tap(tree, '구매하기');
}

beforeEach(() => {
  jest.clearAllMocks();
  useWallet.setState({ balance: 500 });
});
afterEach(() => {
  setPlatform(realOs);
});

describe('첫 활성화 완료 안내', () => {
  it('첫 활성화 뒤 "초대장이 완성되었습니다." 안내와 공유하기가 보인다', async () => {
    const tree = await open('activate', base());
    await buy(tree);
    expect(hasText(tree, TITLE)).toBe(true);
    expect(hasText(tree, '공유하기')).toBe(true);
    expect(hasText(tree, '닫기')).toBe(true);
    expect(toast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('닫기를 누르면 공유 없이 나의 초대장으로 간다', async () => {
    const tree = await open('activate', base());
    await buy(tree);
    await tap(tree, '닫기');
    expect(hasText(tree, TITLE)).toBe(false);
    expect(share).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/my-invites');
  });

  it('바깥을 눌러 닫아도 나의 초대장으로 간다', async () => {
    const tree = await open('activate', base());
    await buy(tree);
    await act(async () => notice(tree).props.onDismiss());
    expect(router.dismissTo).toHaveBeenCalledWith('/my-invites');
  });

  it('iOS: 안내 모달이 완전히 닫힌 뒤에 공유 시트를 열고, 끝나면 나의 초대장으로 간다', async () => {
    setPlatform('ios');
    const tree = await open('activate', base());
    await buy(tree);
    await tap(tree, '공유하기');
    expect(notice(tree).props.visible).toBe(false);
    expect(share).not.toHaveBeenCalled();

    await act(async () => notice(tree).props.onClosed());
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].slug).toBe('abc123');
    expect(router.dismissTo).toHaveBeenCalledWith('/my-invites');
  });

  it('iOS: 닫힘 신호가 두 번 와도 공유 시트는 한 번만 연다', async () => {
    setPlatform('ios');
    const tree = await open('activate', base());
    await buy(tree);
    await tap(tree, '공유하기');
    await act(async () => notice(tree).props.onClosed());
    await act(async () => notice(tree).props.onClosed());
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('공유 시트가 끝나기 전에는 화면을 떠나지 않고, 그동안 다시 구매할 수 없다', async () => {
    setPlatform('android');
    let finish!: () => void;
    share.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
    const tree = await open('activate', base());
    await buy(tree);
    await tap(tree, '공유하기');
    expect(share).toHaveBeenCalledTimes(1); // 안드로이드·웹은 기다리지 않는다
    expect(router.dismissTo).not.toHaveBeenCalled();

    spend.mockClear();
    await tap(tree, '레터로 구매하기');
    expect(hasText(tree, '구매하기')).toBe(false);
    expect(spend).not.toHaveBeenCalled();

    await act(async () => finish());
    expect(router.dismissTo).toHaveBeenCalledWith('/my-invites');
  });

  it('공유하기를 두 번 눌러도 한 번만 공유한다', async () => {
    setPlatform('android');
    const tree = await open('activate', base());
    await buy(tree);
    const button = pressable(tree, '공유하기');
    await act(async () => {
      button.props.onPress();
      button.props.onPress();
    });
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('닫은 뒤의 닫힘 신호로는 공유 시트가 열리지 않는다', async () => {
    setPlatform('ios');
    const tree = await open('activate', base());
    await buy(tree);
    await tap(tree, '닫기');
    await act(async () => notice(tree).props.onClosed());
    expect(share).not.toHaveBeenCalled();
  });
});

describe('안내가 나오지 않는 경우', () => {
  it('만료 뒤 다시 활성화하면 평소처럼 끝난다', async () => {
    const tree = await open('activate', expired());
    await buy(tree);
    expect(hasText(tree, TITLE)).toBe(false);
    expect(toast).toHaveBeenCalledWith('구매를 완료하였습니다.');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('연장 뒤에는 이 안내가 나오지 않는다', async () => {
    const tree = await open('extend', running());
    await tap(tree, '+30일');
    await buy(tree);
    expect(spend).toHaveBeenCalled();
    expect(hasText(tree, TITLE)).toBe(false);
    expect(toast).toHaveBeenCalledWith('구매를 완료하였습니다.');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('AppModal', () => {
  it('onClosed 를 네이티브 모달의 닫힘 신호에 잇는다', () => {
    const onClosed = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<AppModal visible title="안내" actions={[]} onClosed={onClosed} />);
    });
    tree.root.findByType(Modal).props.onDismiss();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});
