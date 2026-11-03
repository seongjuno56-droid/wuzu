import { Keyboard } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AppModal } from '../AppModal';

function render(props: Partial<Parameters<typeof AppModal>[0]> = {}) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppModal visible actions={[]} {...props} />);
  });
  return tree;
}

function pressables(tree: ReactTestRenderer) {
  const dim = tree.root.findAll((n) => n.props.accessibilityLabel === '닫기' && typeof n.props.onPress === 'function')[0];
  const card = tree.root.findAll((n) => n.props.style?.maxWidth === 320 && typeof n.props.onPress === 'function')[0];
  return { dim, card };
}

describe('AppModal 키보드', () => {
  let dismiss: jest.SpyInstance;
  beforeEach(() => {
    dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  });
  afterEach(() => dismiss.mockRestore());

  it('카드의 빈 곳을 누르면 키보드만 내리고 모달은 닫지 않는다', () => {
    const onDismiss = jest.fn();
    const { card } = pressables(render({ onDismiss }));
    act(() => card.props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('바깥을 누르면 키보드를 내리고 닫기를 부른다', () => {
    const onDismiss = jest.fn();
    const { dim } = pressables(render({ onDismiss }));
    act(() => dim.props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('닫기가 없는 모달도 바깥을 누르면 키보드를 내린다', () => {
    const { dim } = pressables(render());
    act(() => dim.props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('avoidKeyboard 를 켜면 키보드만큼 카드를 올린다', () => {
    const lifted = (t: ReactTestRenderer) => t.root.findAll((n) => n.props.behavior === 'padding').length > 0;
    expect(lifted(render({ avoidKeyboard: true }))).toBe(true);
    expect(lifted(render())).toBe(false);
  });
});
