import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { toast, ToastHost } from '../../../components/Toast';
import { SaveNameModal } from '../editor/SaveModals';

const texts = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === 'string' ? c : texts(c))).join('');

describe('저장 모달의 안내', () => {
  it('저장 모달 안에 토스트 자리가 있어, 실패 안내가 모달에 가려지지 않는다', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<SaveNameModal visible kind="draft" initialName="모임" saving={false} onCancel={jest.fn()} onSave={jest.fn()} />);
    });
    expect(tree.root.findAllByType(ToastHost)).toHaveLength(1);
    await act(async () => toast('사진을 올리지 못했어요. 다시 시도해 주세요.'));
    expect(texts(tree.root.findByType(ToastHost))).toContain('사진을 올리지 못했어요. 다시 시도해 주세요.');
    await act(async () => tree.unmount());
  });
});
