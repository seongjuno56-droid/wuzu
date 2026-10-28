import { changeText, press, render } from '../../../test/ui';
import { ContactForm, CorporateBasicForm, CorporateOverviewFields, ProgramForm } from '../editor/CorporateForms';
import { useEditor } from '../editorStore';
import type { CorporateContent } from '../model';

const content = () => useEditor.getState().draft!.content as CorporateContent;

describe('기업 입력 폼', () => {
  beforeEach(() =>
    useEditor
      .getState()
      .start({ ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today: new Date(2026, 9, 25) }),
  );
  it('기본 정보: 행사명·주최를 넣으면 스토어에 들어간다', () => {
    const ui = render(<CorporateBasicForm />);
    changeText(ui.getByPlaceholder('예) 2026 파트너스 데이'), '파트너스 데이');
    changeText(ui.getByPlaceholder('회사·단체 이름'), '우주컴퍼니');
    expect(content().basic.eventName).toBe('파트너스 데이');
    expect(content().basic.host).toBe('우주컴퍼니');
  });
  it('행사 개요: 드레스코드 칩을 누르면 그 값이 들어간다', () => {
    const ui = render(<CorporateOverviewFields />);
    press(ui.getText('비즈니스 캐주얼'));
    expect(content().ceremony.dressCode).toBe('비즈니스 캐주얼');
  });
  it('프로그램: [+ 순서 추가] 로 항목이 는다', () => {
    const ui = render(<ProgramForm />);
    press(ui.getText('순서 추가'));
    expect(content().program.items).toHaveLength(4);
  });
  it('문의처: 잘못된 메일이면 칸 아래 안내', () => {
    const ui = render(<ContactForm />);
    changeText(ui.getByPlaceholder('event@company.com'), 'event@wuzu');
    expect(ui.getText('이메일 형식을 확인해 주세요.')).toBeTruthy();
  });
});
