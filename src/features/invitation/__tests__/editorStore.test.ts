import { useEditor } from '../editorStore';
import { createInvitation } from '../model';

const start = () =>
  useEditor.getState().start({ ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1', today: new Date(2026, 9, 15) });

describe('editor store', () => {
  beforeEach(() => useEditor.getState().reset());

  it('starts a fresh draft with defaults and is not dirty', () => {
    start();
    const { draft, dirty } = useEditor.getState();
    expect(draft?.templateId).toBe('wedding-1');
    expect(draft?.content.ceremony.date).toBe('2026-10-22');
    expect(dirty).toBe(false);
  });

  it('patches a section and marks the draft dirty', () => {
    start();
    useEditor.getState().patch('greeting', { content: '초대합니다' });
    expect(useEditor.getState().draft?.content.greeting.content).toBe('초대합니다');
    expect(useEditor.getState().dirty).toBe(true);
  });

  it('confirms a section only when it is valid', () => {
    start();
    expect(useEditor.getState().confirm('greeting')).toBe(false);
    useEditor.getState().patch('greeting', { content: '초대합니다' });
    expect(useEditor.getState().confirm('greeting')).toBe(true);
    expect(useEditor.getState().draft?.completed.greeting).toBe(true);
  });

  it('drops completion when a confirmed section becomes invalid again', () => {
    start();
    useEditor.getState().patch('greeting', { content: '초대합니다' });
    useEditor.getState().confirm('greeting');
    useEditor.getState().patch('greeting', { content: '' });
    expect(useEditor.getState().draft?.completed.greeting).toBe(false);
  });

  it('toggles optional sections and reorders pages', () => {
    start();
    useEditor.getState().setEnabled('bgm', true);
    useEditor.getState().setOrder(['ceremony', 'gallery', 'account', 'guestbook']);
    const d = useEditor.getState().draft!;
    expect(d.enabled.bgm).toBe(true);
    expect(d.order).toEqual(['ceremony', 'gallery', 'account', 'guestbook']);
  });

  it('clears the dirty flag after saving', () => {
    start();
    useEditor.getState().patch('greeting', { content: '초대합니다' });
    useEditor.getState().markSaved({ ...useEditor.getState().draft!, name: '우리 결혼' });
    expect(useEditor.getState().dirty).toBe(false);
    expect(useEditor.getState().draft?.name).toBe('우리 결혼');
  });

  it('저장본을 불러오면 origin 에 남고, 새로 시작하면 비운다', () => {
    const saved = { ...createInvitation({ id: 's', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }), status: 'final' as const };
    useEditor.getState().load(saved);
    expect(useEditor.getState().origin?.id).toBe('s');
    useEditor.getState().patch('greeting', { content: '바뀜' });
    expect(useEditor.getState().origin?.content.greeting.content).toBe('');
    start();
    expect(useEditor.getState().origin).toBeNull();
  });
});
