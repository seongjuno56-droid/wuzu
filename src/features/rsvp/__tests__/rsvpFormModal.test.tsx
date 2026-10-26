import { act } from 'react-test-renderer';

import { press, render } from '../../../test/ui';
import { RsvpFormModal } from '../RsvpFormModal';

describe('참석 응답 입력창', () => {
  it('저장이 거절되면(invalid) 아무 말 없이 열려 있지 않고 안내한다', async () => {
    const onSubmit = jest.fn().mockResolvedValue('invalid');
    const ui = render(
      <RsvpFormModal
        visible
        themeId="meetup"
        initial={{ name: '김하객', attending: true, org: '', phone: '', companions: 0 }}
        title="응답 추가"
        submitLabel="추가"
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => {
      press(ui.getText('추가'));
    });
    expect(onSubmit).toHaveBeenCalled();
    expect(ui.getText('저장하지 못했어요. 입력한 내용을 확인해 주세요.')).toBeTruthy();
  });
});
