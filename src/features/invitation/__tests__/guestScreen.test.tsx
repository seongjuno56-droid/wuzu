import { isValidElement } from 'react';
import { Dimensions, Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import RootLayout from '../../../app/_layout';
import GuestInvitationRoute from '../../../app/i/[slug]';
import PublicPrivacyScreen from '../../../app/privacy';
import { LoadFailed } from '../../../components/LoadFailed';
import GuestSiteNotFound from '../../../guest-site/+not-found';
import GuestSiteLayout from '../../../guest-site/_layout';
import { toast } from '../../../components/Toast';
import { TERMS_PRIVACY } from '../../../data/terms';
import { EN } from '../../../i18n';
import { invitationService, notificationService, rsvpService } from '../../../services';
import { restoreSession } from '../../../store/session';
import { myRsvp } from '../../rsvp/myRsvp';
import { formMaxHeight, RsvpFormModal } from '../../rsvp/RsvpFormModal';
import { GuestbookModals } from '../GuestbookModals';
import { GUEST_DATA_NOTICE } from '../GuestDataNotice';
import type { Invitation } from '../model';
import { CanvasSlide } from '../../canvas/render/CanvasSlide';
import { sampleInvitation } from '../sample';

let mockSegments: string[] = ['i', '[slug]'];
let mockUsingMock = false;

jest.mock('expo-router', () => {
  const Stack = Object.assign(({ children }: { children?: unknown }) => children ?? null, { Screen: () => null });
  return {
    Stack,
    useLocalSearchParams: () => ({ slug: 'slug-1' }),
    useSegments: () => mockSegments,
    router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn(() => false) },
  };
});
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('../view/BgmButton', () => ({ BgmButton: () => null }));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));
jest.mock('../../wallet/PaymentSheetHost', () => ({ PaymentSheetHost: () => null }));
jest.mock('../../../store/session', () => {
  // 로그인한 만든 사람의 기기에서 열어도 하객으로 다룬다는 것을 보기 위한 값
  const state = { hydrated: true, user: { id: 'owner-1' } };
  return { useSession: (pick: (s: typeof state) => unknown) => pick(state), restoreSession: jest.fn() };
});
jest.mock('../../../services', () => ({
  get usingMockAuth() {
    return mockUsingMock;
  },
  authService: {},
  invitationService: {
    get: jest.fn(),
    getBySlug: jest.fn(),
    listGuestbook: jest.fn(),
    addGuestbook: jest.fn(),
    removeGuestbook: jest.fn(),
  },
  rsvpService: { get: jest.fn(), submit: jest.fn() },
  notificationService: { add: jest.fn(async () => {}) },
}));

const getBySlug = invitationService.getBySlug as jest.Mock;
const listGuestbook = invitationService.listGuestbook as jest.Mock;
const addGuestbook = invitationService.addGuestbook as jest.Mock;
const removeGuestbook = invitationService.removeGuestbook as jest.Mock;
const rsvpGet = rsvpService.get as jest.Mock;
const rsvpSubmit = rsvpService.submit as jest.Mock;
const notify = notificationService.add as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

const THEMES = ['wedding', 'dol', 'corporate', 'meetup'] as const;
/** 서버 visible_invitation_part 의 허용 목록과 같다 */
const ALWAYS_VISIBLE = ['theme', 'cover', 'basic', 'ceremony', 'greeting', 'directions'];

/** 서버가 하객에게 주는 모양: 만든 사람 전용 칸은 빈 값, 꺼진 항목은 content·design 에서 빠진다 */
function guestShape(inv: Invitation): Invitation {
  const pick = <T extends object>(part: T): T =>
    Object.fromEntries(
      Object.entries(part).filter(
        ([k]) => ALWAYS_VISIBLE.includes(k) || (inv.enabled as Record<string, boolean | undefined>)[k] === true,
      ),
    ) as T;
  return {
    ...inv,
    id: 'i1',
    ownerId: '',
    number: '',
    completed: {},
    createdAt: '',
    updatedAt: '',
    status: 'final',
    content: pick(inv.content),
    design: pick(inv.design),
  };
}

function guestInvitation(themeId: string, opts: { viewMode?: Invitation['viewMode']; off?: string[] } = {}): Invitation {
  const inv = sampleInvitation(themeId, `${themeId}-1`);
  const enabled = { ...inv.enabled } as Record<string, boolean>;
  for (const k of opts.off ?? []) enabled[k] = false;
  return guestShape({ ...inv, enabled: enabled as Invitation['enabled'], viewMode: opts.viewMode ?? 'scroll' });
}

const texts = (root: ReactTestInstance) =>
  root
    .findAllByType(Text)
    .map((n) => [n.props.children].flat(Infinity).join(''))
    .join('\n');

const mounted: ReactTestRenderer[] = [];
async function render(el: React.ReactElement) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(el);
  });
  mounted.push(tree);
  return tree;
}
afterEach(async () => {
  await act(async () => {
    for (const t of mounted.splice(0)) t.unmount();
  });
});

/** 폭·높이를 알려 표지까지 그리게 한다 */
async function layout(tree: ReactTestRenderer) {
  for (const n of tree.root.findAll((x) => typeof x.props.onLayout === 'function' && typeof x.type === 'string')) {
    await act(async () => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 640 } } }));
  }
}

const pressByLabel = (root: ReactTestInstance, label: string) =>
  root.findAll((n) => typeof n.props.onPress === 'function' && texts(n).includes(label)).at(-1)!;

beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['i', '[slug]'];
  mockUsingMock = false;
  listGuestbook.mockResolvedValue([]);
  rsvpGet.mockResolvedValue(null);
});

describe('링크 상태별 하객 화면', () => {
  it('active 면 초대장을 그리고 하객 목록을 부른다', async () => {
    getBySlug.mockResolvedValue({ state: 'active', invitation: guestInvitation('wedding') });
    const tree = await render(<GuestInvitationRoute />);
    await layout(tree);
    expect(getBySlug).toHaveBeenCalledWith('slug-1');
    expect(listGuestbook).toHaveBeenCalledWith('i1', 'guest');
    expect(texts(tree.root)).toContain('갤러리');
  });

  it('not_found 면 "초대장을 찾을 수 없어요"', async () => {
    getBySlug.mockResolvedValue({ state: 'not_found' });
    const tree = await render(<GuestInvitationRoute />);
    expect(texts(tree.root)).toContain('초대장을 찾을 수 없어요');
    expect(listGuestbook).not.toHaveBeenCalled();
  });

  it('expired 면 "기간이 끝난 초대장이에요" 만 보이고 내용이 없다', async () => {
    getBySlug.mockResolvedValue({ state: 'expired' });
    const tree = await render(<GuestInvitationRoute />);
    expect(texts(tree.root)).toContain('기간이 끝난 초대장이에요');
    expect(tree.root.findAllByType(GuestbookModals)).toHaveLength(0);
    expect(listGuestbook).not.toHaveBeenCalled();
  });

  it('불러오다 네트워크 오류면 다시 시도 버튼이 있고, 누르면 다시 읽는다', async () => {
    getBySlug.mockRejectedValueOnce(new Error('offline'));
    const tree = await render(<GuestInvitationRoute />);
    const failed = tree.root.findByType(LoadFailed);
    getBySlug.mockResolvedValueOnce({ state: 'active', invitation: guestInvitation('wedding') });
    await act(async () => failed.props.onRetry());
    expect(tree.root.findAllByType(LoadFailed)).toHaveLength(0);
    expect(tree.root.findAllByType(GuestbookModals)).toHaveLength(1);
  });

  it('뒤로 가기 등 앱 화면으로 나가는 버튼이 없다', async () => {
    for (const r of [{ state: 'active', invitation: guestInvitation('wedding') }, { state: 'expired' }, { state: 'not_found' }]) {
      getBySlug.mockResolvedValueOnce(r);
      const tree = await render(<GuestInvitationRoute />);
      expect(tree.root.findAll((n) => n.props.accessibilityLabel === '뒤로 가기')).toHaveLength(0);
    }
  });
});

describe('꺼진 항목이 빠진 하객 초대장', () => {
  const OFF: Record<string, string[]> = {
    wedding: ['account', 'gallery', 'guestbook', 'ending', 'bgm'],
    dol: ['profile', 'timeline', 'account', 'gallery', 'guestbook', 'ending', 'bgm'],
    corporate: ['program', 'speakers', 'rsvp', 'contact', 'ending', 'bgm'],
    meetup: ['program', 'notices', 'gallery', 'guestbook', 'rsvp', 'account', 'ending', 'bgm'],
  };
  for (const themeId of THEMES) {
    for (const viewMode of ['scroll', 'story'] as const) {
      it(`${themeId} ${viewMode}: 빠진 칸 때문에 멈추지 않는다`, async () => {
        const invitation = guestInvitation(themeId, { viewMode, off: OFF[themeId] });
        for (const k of OFF[themeId]) expect(invitation.content).not.toHaveProperty(k);
        getBySlug.mockResolvedValue({ state: 'active', invitation });
        const tree = await render(<GuestInvitationRoute />);
        await layout(tree);
        expect(tree.root.findAllByType(LoadFailed)).toHaveLength(0);
        expect(tree.root.findAllByType(GuestbookModals)).toHaveLength(1);
        // 표지와 항상 켜진 장까지 실제로 그렸는지
        expect(tree.root.findAllByType(CanvasSlide).length).toBeGreaterThan(0);
        expect(texts(tree.root).length).toBeGreaterThan(0);
      });
    }
  }
});

describe('입력 폼의 수집 안내', () => {
  const NOTICE = '입력하신 이름·소속·연락처·내용은 초대장을 만든 분께 전달하기 위해 수집하며, 초대장 기간이 끝나고 30일 뒤 삭제돼요.';

  it('안내 문구가 정해진 그대로다', () => {
    expect(GUEST_DATA_NOTICE).toBe(NOTICE);
  });

  async function openGuestbookForm() {
    getBySlug.mockResolvedValue({ state: 'active', invitation: guestInvitation('wedding') });
    const tree = await render(<GuestInvitationRoute />);
    await act(async () => tree.root.findByType(GuestbookModals).props.onChangeView('write'));
    return tree;
  }
  async function openRsvpForm() {
    getBySlug.mockResolvedValue({ state: 'active', invitation: guestInvitation('corporate') });
    const tree = await render(<GuestInvitationRoute />);
    await layout(tree);
    await act(async () => pressByLabel(tree.root, '참석 신청하기').props.onPress());
    return tree;
  }

  it('방명록 폼 아래에 안내와 처리방침 링크가 있다', async () => {
    const tree = await openGuestbookForm();
    const all = texts(tree.root);
    expect(all).toContain(NOTICE);
    expect(all).toContain('개인정보 처리방침 보기');
    expect(all.indexOf('방명록 남기기')).toBeLessThan(all.indexOf(NOTICE));
  });

  it('참석 응답 폼 아래에 안내와 처리방침 링크가 있다', async () => {
    const tree = await openRsvpForm();
    const form = tree.root.findByType(RsvpFormModal);
    const all = texts(form);
    expect(all).toContain(NOTICE);
    expect(all).toContain('개인정보 처리방침 보기');
    expect(all.indexOf('불참')).toBeLessThan(all.indexOf(NOTICE));
  });

  it('낮은 화면에서도 버튼이 잘리지 않게 입력 칸만 높이를 제한해 스크롤한다', async () => {
    const tree = await openRsvpForm();
    const scroll = tree.root.findByType(RsvpFormModal).findByType(ScrollView);
    const flat = StyleSheet.flatten(scroll.props.style);
    expect(flat.maxHeight).toBe(formMaxHeight(Dimensions.get('window').height));
    // 입력 칸은 스크롤 안, 버튼은 스크롤 밖이다
    expect(texts(scroll)).toContain('불참');
    expect(texts(scroll)).not.toContain('보내기');
    expect(pressByLabel(tree.root.findByType(RsvpFormModal), '보내기')).toBeTruthy();
    expect(formMaxHeight(300)).toBe(120);
    expect(formMaxHeight(800)).toBe(570);
  });

  it('만든 사람의 명단 입력 폼에는 하객 안내가 없다', async () => {
    const tree = await render(
      <RsvpFormModal
        visible
        themeId="corporate"
        initial={{ name: '', attending: true, org: '', phone: '', companions: 0 }}
        title="응답 추가"
        submitLabel="추가"
        onClose={() => {}}
        onSubmit={async () => 'ok'}
      />,
    );
    expect(texts(tree.root)).not.toContain(NOTICE);
  });

  it('웹에서 링크를 누르면 새 탭으로 열어 입력이 남는다', async () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'web');
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    try {
      const tree = await openGuestbookForm();
      await act(async () => pressByLabel(tree.root, '개인정보 처리방침 보기').props.onPress());
      expect(open).toHaveBeenCalledWith('/privacy');
      expect(tree.root.findByType(GuestbookModals).props.view).toBe('write');
    } finally {
      replaced.restore();
      open.mockRestore();
    }
  });

  it('앱에서는 폼 위에 처리방침을 띄우고, 닫으면 폼과 입력이 그대로다', async () => {
    const tree = await openGuestbookForm();
    const field = () =>
      tree.root.findAll((n) => n.props.placeholder === '이름을 입력하세요.' && typeof n.props.onChangeText === 'function')[0];
    await act(async () => field().props.onChangeText('홍길동'));
    await act(async () => pressByLabel(tree.root, '개인정보 처리방침 보기').props.onPress());
    expect(texts(tree.root)).toContain(TERMS_PRIVACY);
    // 네이티브 모달 뒤로 화면을 넣으면 보이지 않으므로 폼 위에 모달로 띄운다
    expect(tree.root.findAllByType(Modal).filter((m) => m.props.visible).length).toBeGreaterThanOrEqual(2);
    const close = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === '뒤로 가기')[0];
    await act(async () => close.props.onPress());
    expect(texts(tree.root)).not.toContain(TERMS_PRIVACY);
    expect(field().props.value).toBe('홍길동');
  });
});

describe('내 응답과 쓰기', () => {
  const input = { name: '홍길동', attending: true, org: '우주', phone: '010-1234-5678', companions: 0 };
  const response = { ...input, id: 'r1', invitationId: 'i1', source: 'guest', createdAt: 'c', updatedAt: 'u' };

  async function open(invitation = guestInvitation('corporate')) {
    getBySlug.mockResolvedValue({ state: 'active', invitation });
    const tree = await render(<GuestInvitationRoute />);
    await layout(tree);
    return tree;
  }
  const labeled = (tree: ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props.onChangeText === 'function' && typeof n.type === 'function' && !!n.props.label);

  it('다시 열면 내 응답을 토큰으로 불러온다', async () => {
    await myRsvp.set('i1', { id: 'r1', token: 'tok' });
    rsvpGet.mockResolvedValue(response);
    const tree = await open();
    expect(rsvpGet).toHaveBeenCalledWith('i1', 'r1', 'tok');
    expect(texts(tree.root)).toContain('응답을 보냈어요');
  });

  it('Supabase 모드에서는 하객 기기에서 알림을 부르지 않는다', async () => {
    rsvpSubmit.mockResolvedValue({ ok: true, response, token: 'tok', created: true });
    const tree = await open({ ...guestInvitation('corporate'), ownerId: 'someone' });
    await act(async () => {
      await tree.root.findByType(RsvpFormModal).props.onSubmit(input);
    });
    expect(notify).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith('응답을 보냈어요');
  });

  it('mock 모드에서는 지금처럼 알림을 남긴다', async () => {
    mockUsingMock = true;
    rsvpSubmit.mockResolvedValue({ ok: true, response, created: true });
    const tree = await open({ ...guestInvitation('corporate'), ownerId: 'someone' });
    await act(async () => {
      await tree.root.findByType(RsvpFormModal).props.onSubmit(input);
    });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('로그인한 만든 사람이 열어도 하객이다: 글 삭제에 비밀번호를 쓴다', async () => {
    removeGuestbook.mockResolvedValue('ok');
    const tree = await open(guestInvitation('wedding'));
    const modals = tree.root.findByType(GuestbookModals);
    expect(modals.props.isOwner).toBe(false);
    await act(async () => {
      await modals.props.onRemove({ id: 'e1' }, '1234');
    });
    expect(removeGuestbook).toHaveBeenCalledWith('i1', 'e1', { password: '1234' });
  });

  it('참석 응답이 rate_limited 면 한국어로 안내한다', async () => {
    rsvpSubmit.mockResolvedValue({ ok: false, reason: 'rate_limited' });
    const tree = await open();
    await act(async () => pressByLabel(tree.root, '참석 신청하기').props.onPress());
    await act(async () => labeled(tree)[0].props.onChangeText(input.name));
    await act(async () => labeled(tree)[1].props.onChangeText(input.org));
    await act(async () => labeled(tree)[2].props.onChangeText(input.phone));
    await act(async () => pressByLabel(tree.root, '보내기').props.onPress());
    expect(toastMock).toHaveBeenCalledWith('지금은 더 받을 수 없어요. 잠시 후 다시 시도해 주세요.');
  });

  it('방명록 쓰기가 RATE_LIMITED 면 한국어로 안내한다', async () => {
    addGuestbook.mockRejectedValue(new Error('RATE_LIMITED'));
    const tree = await render(
      <GuestbookModals view="write" onChangeView={() => {}} entries={[]} isOwner={false} onAdd={addGuestbook} onRemove={removeGuestbook} />,
    );
    await act(async () => labeled(tree)[0].props.onChangeText('홍길동'));
    await act(async () => labeled(tree)[1].props.onChangeText('1234'));
    await act(async () => labeled(tree)[2].props.onChangeText('축하해요'));
    await act(async () => pressByLabel(tree.root, '방명록 남기기').props.onPress());
    expect(toastMock).toHaveBeenCalledWith('지금은 글을 더 남길 수 없어요. 잠시 후 다시 시도해 주세요.');
  });
});

describe('방명록 200개 안내', () => {
  const entries = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `e${i}`, invitationId: 'i1', name: '하객', content: '축하', createdAt: 'c' }));
  const NOTE = '최근 200개만 보여요';
  const view = (n: number, isOwner: boolean) =>
    render(<GuestbookModals view="all" onChangeView={() => {}} entries={entries(n)} isOwner={isOwner} onAdd={async () => {}} onRemove={removeGuestbook} />);

  it('하객 목록이 200개에 닿으면 안내한다', async () => {
    expect(texts((await view(200, false)).root)).toContain(NOTE);
  });
  it('199개면 안내하지 않는다', async () => {
    expect(texts((await view(199, false)).root)).not.toContain(NOTE);
  });
  it('만든 사람은 전체를 보므로 안내하지 않는다', async () => {
    expect(texts((await view(200, true)).root)).not.toContain(NOTE);
  });
});

describe('사진 불러오기 실패', () => {
  const BROKEN = 'https://example.invalid/broken.webp';

  it('갤러리·인사말 사진 주소가 깨져도 화면이 멈추지 않는다', async () => {
    const base = sampleInvitation('wedding', 'wedding-1');
    const invitation = guestShape({
      ...base,
      viewMode: 'scroll',
      content: {
        ...base.content,
        greeting: { ...base.content.greeting, photo: BROKEN },
        gallery: { ...(base.content as unknown as { gallery: object }).gallery, photos: [BROKEN] },
      } as Invitation['content'],
    });
    getBySlug.mockResolvedValue({ state: 'active', invitation });
    const tree = await render(<GuestInvitationRoute />);
    await layout(tree);
    const images = tree.root.findAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      if (img.props.onError) await act(async () => img.props.onError({ nativeEvent: { error: 'failed' } }));
    }
    expect(texts(tree.root)).toContain('갤러리');
  });

  it('표지 사진이 깨지면 그 자리만 바뀌고 나머지는 남는다', async () => {
    const invitation = guestInvitation('dol');
    (invitation.content as unknown as { basic: { photo: string | null } }).basic.photo = BROKEN;
    getBySlug.mockResolvedValue({ state: 'active', invitation });
    const tree = await render(<GuestInvitationRoute />);
    await layout(tree);
    const failing = () => tree.root.findAll((n) => typeof n.props.onError === 'function' && n.props.source?.uri === BROKEN);
    expect(failing().length).toBeGreaterThan(0);
    await act(async () => failing()[0].props.onError({ error: 'failed' }));
    expect(failing()).toHaveLength(0);
    expect(tree.root.findAllByType(GuestbookModals)).toHaveLength(1);
  });
});

describe('공개 웹 경로', () => {
  it('첫 화면을 강제하는 설정이 없다: 바로 연 /i/<slug> 가 스플래시(index)를 거치지 않는다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require('../../../app/_layout').unstable_settings).toBeUndefined();
  });
  it('/i/* 에서는 세션을 복구하지 않는다', async () => {
    mockSegments = ['i', '[slug]'];
    await render(<RootLayout />);
    expect(restoreSession).not.toHaveBeenCalled();
  });
  it('/privacy 에서는 세션을 복구하지 않는다', async () => {
    mockSegments = ['privacy'];
    await render(<RootLayout />);
    expect(restoreSession).not.toHaveBeenCalled();
  });
  it('앱 화면에서는 세션을 복구한다', async () => {
    mockSegments = ['(tabs)', 'home'];
    await render(<RootLayout />);
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });
  it('/privacy 는 처리방침을 보여 주고, 돌아갈 곳이 없으면 앱으로 가는 뒤로 버튼을 두지 않는다', async () => {
    const tree = await render(<PublicPrivacyScreen />);
    expect(texts(tree.root)).toContain(TERMS_PRIVACY);
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === '뒤로 가기')).toHaveLength(0);
  });
});

describe('공개 웹 라우터', () => {
  it('없는 주소 화면에는 앱으로 나가는 버튼이 없다', async () => {
    const tree = await render(<GuestSiteNotFound />);
    expect(texts(tree.root)).toContain('페이지를 찾을 수 없어요');
    expect(tree.root.findAll((n) => typeof n.props.onPress === 'function')).toHaveLength(0);
  });
  it('뿌리는 세션을 복구하지 않고, 글꼴을 기다리지 않고 바로 그린다', async () => {
    await render(<GuestSiteLayout />);
    expect(restoreSession).not.toHaveBeenCalled();
    // 훅을 쓰지 않는 컴포넌트라 트리를 바로 본다. 글꼴·세션 조건 없이 Stack 이 있다
    const hasStack = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(hasStack);
      if (!isValidElement(node)) return false;
      return node.type === Stack || hasStack((node.props as { children?: unknown }).children);
    };
    expect(hasStack(GuestSiteLayout())).toBe(true);
  });
  it('하객 경로 파일은 앱의 화면을 그대로 쓴다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require('../../../guest-site/i/[slug]').default).toBe(GuestInvitationRoute);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require('../../../guest-site/privacy').default).toBe(PublicPrivacyScreen);
  });
});

describe('처리방침 문구', () => {
  it('하객 입력 정보, 파기 기간, Cloudflare 저장·국외 이전·처리 위탁을 담는다', () => {
    for (const word of ['방명록', '참석 응답', '초대장 기간이 끝나고 30일 뒤', 'Cloudflare', '국외', '위탁', '한국으로 고정되어 있지 않습니다']) {
      expect(TERMS_PRIVACY).toContain(word);
    }
  });
  it('새 문구의 영어 번역이 있다', () => {
    for (const key of ['개인정보 처리방침 보기', '기간이 끝난 초대장이에요', '최근 200개만 보여요', GUEST_DATA_NOTICE]) {
      expect(EN[key]).toBeTruthy();
    }
  });
});
