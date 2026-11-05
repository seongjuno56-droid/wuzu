import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useLocale } from '../../i18n';
import { render } from '../ui';

function LocaleText() {
  const locale = useLocale((s) => s.locale);
  return <Text>{locale}</Text>;
}

/**
 * 테스트가 그린 화면이 남아 있으면 스토어 변화(언어 되돌리기 등)가 act 밖에서 렌더를 예약하고,
 * 그 렌더가 테스트 환경이 닫힌 뒤에 돌아 같은 작업자의 다른 스위트를 "Test suite failed to run" 으로 떨어뜨린다.
 */
describe('테스트가 끝나면 그린 화면을 내린다', () => {
  let raw: ReactTestRenderer;
  let helper: ReturnType<typeof render>;

  it('그려 두고 내리지 않은 채 끝난다', () => {
    act(() => {
      raw = create(<LocaleText />);
    });
    helper = render(<LocaleText />);
    expect(raw.toJSON()).not.toBeNull();
    expect(helper.queryText('ko')).toBeTruthy();
  });

  it('다음 테스트에서는 create 로 그린 것도, render 로 그린 것도 내려가 있다', () => {
    expect(raw.toJSON()).toBeNull();
    expect(() => helper.queryText('ko')).toThrow();
  });

  it('직접 내린 화면도 문제없다', () => {
    const ui = render(<LocaleText />);
    ui.unmount();
  });
});
