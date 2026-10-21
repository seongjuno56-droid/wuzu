import { act, create } from 'react-test-renderer';

import { useLocale } from '../../i18n';
import { Txt } from '../Txt';

const textOf = (el: React.ReactElement) => {
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(el);
  });
  return r.root.findByType('Text' as never).props.children;
};

describe('Txt 번역', () => {
  beforeEach(() => {
    act(() => {
      useLocale.setState({ locale: 'en' });
    });
  });

  it('화면 문구는 영어로', () => {
    expect(textOf(<Txt>나의 초대장</Txt>)).toBe('My Invitations');
  });
  it('raw 면 사용자 글은 사전에 있어도 그대로', () => {
    expect(textOf(<Txt raw>나의 초대장</Txt>)).toBe('나의 초대장');
  });
});
