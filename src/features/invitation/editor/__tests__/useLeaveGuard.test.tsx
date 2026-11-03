import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AppModal } from '../../../../components/AppModal';
import { useLeaveGuard } from '../useLeaveGuard';

const mockDispatch = jest.fn();
const mockDisable = jest.fn();
let mockPrevented = false;
let mockBlocked: ((o: { data: { action: object } }) => void) | undefined;

jest.mock('expo-router', () => ({
  useNavigation: () => ({ dispatch: mockDispatch, goBack: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(cb, [cb]);
  },
  usePreventRemove: (prevent: boolean, cb: typeof mockBlocked) => {
    mockPrevented = prevent;
    mockBlocked = cb;
    return mockDisable;
  },
}));

jest.mock('../../../../components/AppModal', () => ({ AppModal: () => null }));

let guard: ReturnType<typeof useLeaveGuard>;
function Host({ dirty }: { dirty: boolean }) {
  const g = useLeaveGuard(dirty);
  useEffect(() => {
    guard = g;
  });
  return g.modal;
}

const ACTION = { type: 'GO_BACK' };

function mount(dirty: boolean) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Host dirty={dirty} />);
  });
  return tree;
}

const modalProps = (tree: ReactTestRenderer) => tree.root.findByType(AppModal).props;

describe('작성 중 이탈 경고', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockDisable.mockClear();
  });

  it('변경이 없으면 막지 않는다', () => {
    mount(false);
    expect(mockPrevented).toBe(false);
  });

  it('변경이 있으면 막고, 막힌 이동이 오면 확인 모달을 띄운다', () => {
    const tree = mount(true);
    expect(mockPrevented).toBe(true);
    expect(modalProps(tree).visible).toBe(false);
    act(() => mockBlocked?.({ data: { action: ACTION } }));
    expect(modalProps(tree).visible).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('닫기를 누르면 그 화면에 머문다', () => {
    const tree = mount(true);
    act(() => mockBlocked?.({ data: { action: ACTION } }));
    act(() => modalProps(tree).actions[0].onPress());
    expect(modalProps(tree).visible).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockPrevented).toBe(true);
  });

  it('이동을 누르면 막기를 풀고 막혔던 이동을 다시 보낸다', () => {
    const tree = mount(true);
    act(() => mockBlocked?.({ data: { action: ACTION } }));
    act(() => modalProps(tree).actions[1].onPress());
    expect(mockDisable).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(ACTION);
    expect(mockPrevented).toBe(false);
  });

  it('allow() 를 부르면 바로 막기를 푼다', () => {
    mount(true);
    act(() => guard.allow());
    expect(mockDisable).toHaveBeenCalled();
    expect(mockPrevented).toBe(false);
  });
});
