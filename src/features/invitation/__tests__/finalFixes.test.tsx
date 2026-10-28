import { press, render } from '../../../test/ui';
import { photoFit } from '../../canvas/model';
import { defaultCorporateEnding } from '../corporate';
import { EndingForm } from '../editor/MediaForms';
import { useEditor } from '../editorStore';
import { saveFormatFor } from '../media';

// BGM 미리듣기(expo-audio)는 테스트 환경에서 못 불러온다 — 엔딩 폼 버튼만 본다
jest.mock('expo-audio', () => ({ useAudioPlayer: () => null, useAudioPlayerStatus: () => ({}) }));

describe('최종 검토 지적', () => {
  it('기업 엔딩 [기본 문구 넣기]는 기업 문구 (결혼식 문구가 아님)', () => {
    useEditor
      .getState()
      .start({ ownerId: 'u', themeId: 'corporate', templateId: 'corporate-1', today: new Date(2026, 9, 25) });
    useEditor.getState().patch('ending', { content: '' });
    const ui = render(<EndingForm />);
    press(ui.getText('기본 문구 넣기'));
    expect(useEditor.getState().draft!.content.ending.content).toBe(defaultCorporateEnding());
  });
  it('로고는 PNG 를 그대로 두고(투명 배경), 틀 안에 잘리지 않게 그린다', () => {
    expect(saveFormatFor({ mimeType: 'image/png', fileName: 'logo.png' }, true)).toBe('png');
    expect(saveFormatFor({ mimeType: 'image/png', fileName: 'a.png' }, false)).toBe('jpeg');
    expect(saveFormatFor({ mimeType: 'image/jpeg', fileName: 'a.jpg' }, true)).toBe('jpeg');
    expect(photoFit('logo')).toBe('contain');
    expect(photoFit('coverPhoto')).toBe('cover');
  });
});
