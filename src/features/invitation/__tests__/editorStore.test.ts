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
  it('저장본 갱신(setOrigin): 편집 중 내용은 두고 기준 저장본만 바꾼다', () => {
    const saved = { ...createInvitation({ id: 's', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1' }), status: 'final' as const };
    useEditor.getState().load(saved);
    useEditor.getState().patch('greeting', { content: '편집 중' });
    const latest = { ...saved, expiresAt: '2099-01-01T00:00:00.000Z' };
    useEditor.getState().setOrigin(latest);
    expect(useEditor.getState().origin?.expiresAt).toBe('2099-01-01T00:00:00.000Z');
    expect(useEditor.getState().draft?.content.greeting.content).toBe('편집 중');
    expect(useEditor.getState().dirty).toBe(true);
  });
  it('보기 형태를 지정해 시작하고 바꿀 수 있다', () => {
    useEditor.getState().start({ ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1', viewMode: 'scroll' });
    expect(useEditor.getState().draft?.viewMode).toBe('scroll');
    useEditor.getState().setViewMode('story');
    expect(useEditor.getState().draft?.viewMode).toBe('story');
    expect(useEditor.getState().dirty).toBe(true);
  });

  it('직접 꾸미기 → 프리셋 복사본으로 캔버스 시작, 원래대로 → 형식', () => {
    start();
    useEditor.getState().startCanvas('cover');
    const design = useEditor.getState().draft?.design.cover;
    expect(design?.mode).toBe('canvas');
    if (design?.mode !== 'canvas') throw new Error('캔버스가 아님');
    expect(design.canvas.elements.length).toBeGreaterThan(0);

    const doc = { ...design.canvas, background: { kind: 'color' as const, color: '#000000' } };
    useEditor.getState().applyCanvas('cover', doc);
    const applied = useEditor.getState().draft?.design.cover;
    expect(applied?.mode === 'canvas' && applied.canvas.background).toEqual({ kind: 'color', color: '#000000' });

    useEditor.getState().resetDesign('cover');
    expect(useEditor.getState().draft?.design.cover).toBeUndefined();
  });

  it('캔버스로 바꿔도 기본정보 완료 표시는 그대로다', () => {
    start();
    const before = useEditor.getState().draft?.completed;
    useEditor.getState().startCanvas('cover');
    expect(useEditor.getState().draft?.completed).toEqual(before);
  });
});
