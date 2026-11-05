import { Keyboard } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AppModal } from '../../../components/AppModal';
import { SaveNameModal } from '../editor/SaveModals';

describe('저장 버튼과 키보드', () => {
  async function pressSave() {
    const onSave = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<SaveNameModal visible kind="draft" initialName="모임" saving={false} onCancel={jest.fn()} onSave={onSave} />);
    });
    const action = tree.root.findByType(AppModal).props.actions[1];
    await act(async () => action.onPress());
    const result = { onSave, dismissOrder: dismiss.mock.invocationCallOrder[0], saveOrder: onSave.mock.invocationCallOrder[0] };
    dismiss.mockRestore();
    await act(async () => tree.unmount());
    return result;
  }

  it('저장을 누르면 키보드를 먼저 내린다 (실패 안내가 키보드에 가려지지 않게)', async () => {
    const r = await pressSave();
    expect(r.onSave).toHaveBeenCalledWith('모임');
    expect(r.dismissOrder).toBeLessThan(r.saveOrder);
  });
});
