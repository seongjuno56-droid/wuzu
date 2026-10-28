import { defaultMeetupContent } from '../../invitation/meetup';
import { render } from '../../../test/ui';
import { ElementContent } from '../render/ElementView';
import type { CanvasElement } from '../types';

jest.mock('../render/VideoElement', () => ({ VideoElement: () => null }));

const content = defaultMeetupContent(new Date(2026, 9, 26));
const slot: CanvasElement = {
  id: 'preset-photo', kind: 'photo', bind: 'coverPhoto', optional: true,
  x: 0.5, y: 0.3, w: 0.5, rotation: 0, aspect: 1, frame: 'circle',
};

describe('빈 선택 사진 칸', () => {
  it('하객 화면에서는 그리지 않는다', () => {
    const ui = render(<ElementContent el={slot} content={content} slideW={360} />);
    expect(ui.queryText('대표 사진')).toBeNull();
  });
  it('직접 꾸미기에서는 점선 칸과 이름을 보여 줘서 고를 수 있다', () => {
    const ui = render(<ElementContent el={slot} content={content} slideW={360} editing />);
    ui.getText('대표 사진');
    ui.getLabel('빈 사진 칸');
  });
  it('기업 로고 칸은 "로고"', () => {
    const logo = { ...slot, bind: 'logo' } as CanvasElement;
    const ui = render(<ElementContent el={logo} content={content} slideW={360} editing />);
    ui.getText('로고');
  });
});
