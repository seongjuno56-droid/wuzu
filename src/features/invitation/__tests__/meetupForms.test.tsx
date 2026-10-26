import { changeText, press, render } from '../../../test/ui';
import { RsvpSettingsForm } from '../editor/CorporateForms';
import { MeetupAccountForm, MeetupBasicForm, NoticesForm } from '../editor/MeetupForms';
import { useEditor } from '../editorStore';
import type { MeetupContent } from '../model';

const content = () => useEditor.getState().draft!.content as MeetupContent;

describe('모임 입력 폼', () => {
  beforeEach(() =>
    useEditor
      .getState()
      .start({ ownerId: 'u', themeId: 'meetup', templateId: 'meetup-1', today: new Date(2026, 9, 26) }),
  );
  it('기본 정보: 모임 이름·주최', () => {
    const ui = render(<MeetupBasicForm />);
    changeText(ui.getByPlaceholder('예) 03학번 연말 송년회'), '연말 송년회');
    changeText(ui.getByPlaceholder('예) 김모임 또는 우리 동기 모임'), '동기 모임');
    expect(content().basic).toMatchObject({ eventName: '연말 송년회', host: '동기 모임' });
  });
  it('안내사항: [안내 추가] 로 카드가 는다 (최대 5)', () => {
    const ui = render(<NoticesForm />);
    press(ui.getText('안내 추가'));
    expect(content().notices.items).toHaveLength(3);
  });
  it('회비 계좌: 예금주를 넣으면 들어간다', () => {
    const ui = render(<MeetupAccountForm />);
    changeText(ui.getByPlaceholder('예) 1인 3만원'), '1인 2만원');
    changeText(ui.getByPlaceholder('예금주'), '김모임');
    expect(content().account).toMatchObject({ amount: '1인 2만원', holder: '김모임' });
  });
  it('참석 여부 설정: 받는 항목이 모임 기준', () => {
    const ui = render(<RsvpSettingsForm />);
    expect(ui.getText('이름 · 참석 여부 · 동반 인원')).toBeTruthy();
  });
});

describe('참석 여부 설정 안내 — 모임', () => {
  beforeEach(() =>
    useEditor
      .getState()
      .start({ ownerId: 'u', themeId: 'meetup', templateId: 'meetup-1', today: new Date(2026, 9, 26) }),
  );
  it('명단은 카드 더보기에 있다고 안내한다', () => {
    const ui = render(<RsvpSettingsForm />);
    expect(
      ui.getText(
        '받은 응답은 나의 초대장 카드의 [⋮ 더보기] > [참석 응답]에서 보고, 전화로 받은 응답도 직접 넣을 수 있어요.',
      ),
    ).toBeTruthy();
  });
});
