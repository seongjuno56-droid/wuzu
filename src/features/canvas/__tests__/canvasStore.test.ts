import { useCanvas } from '../canvasStore';
import { addElement, removeElement, updateElement } from '../model';
import type { CanvasDoc, CanvasElement } from '../types';

const el = (id: string): CanvasElement => ({
  id, kind: 'text', text: id, x: 0.5, y: 0.5, w: 0.5, rotation: 0, font: 'sans', color: '#000', size: 0.05, align: 'center',
});
const empty: CanvasDoc = { background: { kind: 'template' }, elements: [] };
const s = () => useCanvas.getState();

describe('캔버스 편집 스토어', () => {
  beforeEach(() => s().open(empty));

  it('커밋 한 번 = 되돌리기 1단계, 다시하기로 복구', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().commit(updateElement(s().doc!, 'a', { x: 0.1 }));
    expect(s().past).toHaveLength(2);
    s().undo();
    expect(s().doc!.elements[0].x).toBe(0.5);
    s().redo();
    expect(s().doc!.elements[0].x).toBe(0.1);
  });

  it('새로 커밋하면 다시하기 기록은 비운다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().undo();
    s().commit(addElement(s().doc!, el('b')));
    expect(s().future).toEqual([]);
  });

  it('기록은 최대 50단계', () => {
    for (let i = 0; i < 60; i++) s().commit(addElement(s().doc!, el(`e${i}`)));
    expect(s().past).toHaveLength(50);
  });

  it('같은 문서를 커밋하면 기록하지 않는다', () => {
    s().commit(s().doc!);
    expect(s().past).toHaveLength(0);
  });

  it('되돌리기로 선택 요소가 사라지면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().undo();
    expect(s().selectedId).toBeNull();
  });

  it('삭제 커밋 후 선택 요소가 없으면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().commit(removeElement(s().doc!, 'a'));
    expect(s().selectedId).toBeNull();
  });

  it('도구를 바꾸면 선택을 푼다', () => {
    s().commit(addElement(s().doc!, el('a')));
    s().select('a');
    s().setTool('pen');
    expect(s().selectedId).toBeNull();
  });
});
