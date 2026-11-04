import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import EditorCompose from '../../../app/create/editor/compose';
import { toast } from '../../../components/Toast';
import { invitationService, walletService } from '../../../services';
import { MediaUploadError } from '../../../services/media/uploadDraftMedia';
import { usePurchaseFlow } from '../../wallet/usePurchaseFlow';
import { SaveNameModal } from '../editor/SaveModals';
import { useEditor } from '../editorStore';
import type { Invitation } from '../model';

const ID = '11111111-2222-4333-8444-555555555555';
const mockUpload = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));
jest.mock('../../../components/Toast', () => ({ toast: jest.fn(), ToastHost: () => null }));
jest.mock('../../../store/session', () => ({
  useSession: (pick: (s: { user: { id: string } }) => unknown) => pick({ user: { id: 'u1' } }),
}));
jest.mock('../../../services', () => ({
  invitationService: { save: jest.fn(), get: jest.fn() },
  walletService: { spend: jest.fn() },
  get mediaUploader() {
    return mockUpload;
  },
}));
jest.mock('../../wallet/confirm', () => ({ confirmWithBiometrics: jest.fn(async () => true) }));
jest.mock('../../canvas/editor/CanvasEditor', () => ({ CanvasEditor: () => null }));
jest.mock('../editor/SlideStage', () => ({ SlideStage: () => null }));
jest.mock('../editor/DockBar', () => ({ DockBar: () => null }));
jest.mock('../editor/SectionSheet', () => ({ SectionSheet: () => null }));
jest.mock('../editor/EditPayModal', () => ({ EditPayModal: () => null }));
jest.mock('../editor/PalettePicker', () => ({ PaletteDot: () => null, PaletteModal: () => null }));
jest.mock('../editor/ViewModePicker', () => ({ ViewModeModal: () => null }));
jest.mock('../editor/useLeaveGuard', () => ({ useLeaveGuard: () => ({ allow: jest.fn(), modal: null }) }));

const save = invitationService.save as jest.Mock;
const spend = walletService.spend as jest.Mock;
const toasts = () => (toast as jest.Mock).mock.calls.map((c) => c[0]);
const PHOTO = 'file:///cover.webp';
const photoOf = (inv: Invitation) => (inv.content as never as { basic: { photo: string | null } }).basic.photo;

function startDraft() {
  useEditor.getState().start({ ownerId: 'u1', themeId: 'meetup', templateId: 'meetup-1' });
  useEditor.getState().patch('basic', { photo: PHOTO });
}

async function renderCompose() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<EditorCompose />);
  });
  return tree;
}
const pressSave = (tree: ReactTestRenderer) => act(async () => tree.root.findByType(SaveNameModal).props.onSave('우리 모임'));

beforeEach(() => {
  jest.clearAllMocks();
  save.mockImplementation(async (inv: Invitation) => ({ ...inv, id: ID }));
});

describe('정보 입력 저장', () => {
  it('올리기가 실패하면 안내하고, 편집 내용과 받은 id 는 남고, 기기 주소는 서버에 가지 않는다', async () => {
    startDraft();
    mockUpload.mockRejectedValueOnce(new MediaUploadError(new Error('끊김')));
    const tree = await renderCompose();
    await pressSave(tree);

    expect(toasts()).toEqual(['사진을 올리지 못했어요. 다시 시도해 주세요.']);
    expect(save).toHaveBeenCalledTimes(1);
    expect(photoOf(save.mock.calls[0][0])).toBeNull();
    const draft = useEditor.getState().draft!;
    expect(draft.id).toBe(ID);
    expect(photoOf(draft)).toBe(PHOTO);
    expect(useEditor.getState().dirty).toBe(true);
    expect(tree.root.findByType(SaveNameModal).props.saving).toBe(false);
  });

  it('다시 저장하면 같은 id 로 고치고, 끝나면 저장본으로 바뀐다', async () => {
    startDraft();
    const url = 'https://media/cover.webp';
    mockUpload.mockRejectedValueOnce(new MediaUploadError(new Error('끊김')));
    mockUpload.mockImplementationOnce(async (inv: Invitation) => ({
      ...inv,
      content: { ...inv.content, basic: { ...(inv.content as never as { basic: object }).basic, photo: url } },
    }));
    const tree = await renderCompose();
    await pressSave(tree);
    await pressSave(tree);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].id).toBe(ID);
    expect(photoOf(save.mock.calls[1][0])).toBe(url);
    expect(useEditor.getState().dirty).toBe(false);
  });

  it('올리는 동안 진행 상황을 넘기고, 끝나면 지운다', async () => {
    startDraft();
    let finish!: (inv: Invitation) => void;
    mockUpload.mockImplementationOnce((inv: Invitation, onProgress: (d: number, t: number) => void) => {
      onProgress(1, 3);
      return new Promise((resolve) => {
        finish = () => resolve(inv);
      });
    });
    save.mockImplementation(async (inv: Invitation) => ({ ...inv, id: ID, content: { ...inv.content, basic: { photo: null } } }));
    const tree = await renderCompose();
    let pending: unknown;
    await act(async () => {
      pending = tree.root.findByType(SaveNameModal).props.onSave('우리 모임');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(tree.root.findByType(SaveNameModal).props.progress).toEqual({ done: 1, total: 3 });
    await act(async () => {
      finish(useEditor.getState().draft!);
      await pending;
    });
    expect(tree.root.findByType(SaveNameModal).props.progress).toBeNull();
  });
});

describe('유료 수정', () => {
  const edited = () => {
    startDraft();
    return { ...useEditor.getState().draft!, id: ID };
  };
  let run!: ReturnType<typeof usePurchaseFlow>['run'];
  const onDone = jest.fn();
  function Host() {
    run = usePurchaseFlow({ onDone }).run;
    return null;
  }
  const mount = () =>
    act(async () => {
      create(<Host />);
    });

  it('올리기가 실패하면 레터를 쓰지 않고 안내한다', async () => {
    mockUpload.mockRejectedValueOnce(new MediaUploadError(new Error('끊김')));
    await mount();
    await act(async () => run({ kind: 'edit', invitation: edited() }));
    expect(toasts()).toEqual(['사진을 올리지 못했어요. 다시 시도해 주세요.']);
    expect(spend).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('올린 뒤의 초대장으로 수정 주문을 낸다', async () => {
    const uploaded = { ...edited(), name: '올림' };
    mockUpload.mockResolvedValueOnce(uploaded);
    spend.mockResolvedValueOnce({ ok: true, invitation: uploaded, balance: 1 });
    await mount();
    await act(async () => run({ kind: 'edit', invitation: edited() }));
    expect(spend).toHaveBeenCalledWith('u1', { kind: 'edit', invitation: uploaded });
    expect(onDone).toHaveBeenCalledWith(uploaded);
  });

  it('활성화·연장은 파일을 올리지 않는다', async () => {
    spend.mockResolvedValueOnce({ ok: false, reason: 'invalid' });
    await mount();
    await act(async () => run({ kind: 'extend', invitationId: ID, extendDays: 30 }));
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
