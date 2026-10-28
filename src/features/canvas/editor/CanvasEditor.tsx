import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Button } from '../../../components/Button';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import type { TemplateStyle } from '../../../data/templates';
import { colors, spacing } from '../../../theme';
import type { InvitationContent } from '../../invitation/model';
import { useCanvas } from '../canvasStore';
import {
  addElement,
  bindsFor,
  strokeFromPoints,
  canAdd,
  duplicateElement,
  finishTextEdit,
  fitSlide,
  inRect,
  Rect,
  LIMIT_MESSAGE,
  newElementId,
  palette,
  removeElement,
  reorderElement,
  tapToSlide,
  updateElement,
} from '../model';
import { pickCanvasVideo, pickCanvasVisual } from '../media';
import { PASTE_MESSAGE, PasteResult, readClipboard } from '../paste';
import { useWebCanvasKeys } from '../useWebCanvasKeys';
import { CanvasSlide } from '../render/CanvasSlide';
import type { CanvasDoc, CanvasElement, TextElement } from '../types';
import { CanvasToolbar, ToolKey } from './CanvasToolbar';
import { EditableElement } from './EditableElement';
import { Guides } from './Guides';
import { InlineTextEditor } from './InlineTextEditor';
import { PEN_WIDTHS, PenLayer, PenOptions } from './PenLayer';
import { PropertyBar, PropertyCommand } from './PropertyBar';
import { BackgroundPicker, BindPicker, StickerPicker } from './Pickers';

export interface CanvasEditorProps {
  initial: CanvasDoc;
  content: InvitationContent;
  style: TemplateStyle;
  /** 정보 글자 목록이 테마마다 다르다 */
  themeId: string;
  onDone: (doc: CanvasDoc) => void;
  onCancel: () => void;
  /** 연결 텍스트 수정 시 [기본정보 열기] */
  onOpenBasic: () => void;
}

/** 아래 속성 바 자리 높이 — 늘 같은 높이를 잡아 둬서 요소를 고를 때 슬라이드 크기가 바뀌지 않는다 */
const PANEL_H = 148;

/**
 * 캔버스 편집기 (인스타 스토리식): 상단 바(취소·되돌리기·다시하기·완료) → 도구 줄 → 슬라이드 → 속성 바.
 * 빈 곳을 누르면 그 자리에 글자, 글자를 누르면 그 자리에서 수정, 요소를 끌면 아래 휴지통이 나타난다.
 */
export function CanvasEditor({ initial, content, style, themeId, onDone, onCancel, onOpenBasic }: CanvasEditorProps) {
  const { doc, selectedId, tool, past, future, open, close, select, setTool, commit, undo, redo } = useCanvas();
  // 무대 크기와 편집기 안에서의 세로 위치 (그 자리 입력 막이 편집기 전체를 덮을 때 슬라이드 자리 계산용)
  const [box, setBox] = useState({ width: 0, height: 0, y: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });
  // 그 자리 글자 입력: 새 글자면 isNew (마칠 때 쓴 게 있을 때만 더한다)
  const [editing, setEditing] = useState<{ el: TextElement; isNew: boolean } | null>(null);
  // 끄는 중 손가락 위치 — 있으면 휴지통을 보이고 다른 도구를 숨긴다
  const [dragAt, setDragAt] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<View>(null);
  const trashRef = useRef<View>(null);
  const trashRect = useRef<Rect | null>(null);
  const [trashBox, setTrashBox] = useState<Rect | null>(null);
  // 놓는 순간 판정은 렌더를 기다리지 않도록 ref 로
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [boundNotice, setBoundNotice] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [picker, setPicker] = useState<'sticker' | 'bind' | 'background' | null>(null);
  const [penColor, setPenColor] = useState(style.fg);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);
  const colorsList = useMemo(() => palette(style), [style]);
  // 요소를 마지막으로 만진 시각 — 같은 터치의 배경 탭(선택 해제)을 무시하려고
  const touchedAt = useRef(0);

  useEffect(() => {
    open(initial);
    return () => close();
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 한도 검사 후 추가하고 선택 */
  // 비동기(앨범 선택 등) 뒤에도 최신 문서에 더하도록 스토어에서 직접 읽는다
  const add = (el: CanvasElement) => {
    const cur = useCanvas.getState().doc!;
    const err = canAdd(cur, el.kind);
    if (err) {
      toast(LIMIT_MESSAGE[err]);
      return;
    }
    useCanvas.getState().commit(addElement(cur, el));
    select(el.id);
  };

  const textBase = {
    x: 0.5,
    y: 0.5,
    w: 0.8,
    rotation: 0,
    font: style.font === 'serif' ? ('serif' as const) : ('sans' as const),
    color: style.fg,
    size: 20 / 360,
    align: 'center' as const,
  };

  /** 붙여넣기 결과를 요소로 (텍스트·사진·GIF) */
  const applyPaste = (r: PasteResult) => {
    if (r.kind === 'empty' || r.kind === 'unsupported' || r.kind === 'tooLarge') return toast(PASTE_MESSAGE[r.kind]);
    if (r.kind === 'text') return add({ ...textBase, id: newElementId(), kind: 'text', text: r.text });
    const base = { id: newElementId(), x: 0.5, y: 0.5, w: 0.6, rotation: 0, uri: r.uri, aspect: r.aspect };
    add(r.kind === 'gif' ? { ...base, kind: 'gif' } : { ...base, kind: 'image', shape: 'rect' });
  };

  // 웹: Delete 삭제, Ctrl+Z / Ctrl+Shift+Z, Ctrl+V 붙여넣기
  useWebCanvasKeys({
    onDelete: () => {
      const st = useCanvas.getState();
      if (st.doc && st.selectedId) st.commit(removeElement(st.doc, st.selectedId));
    },
    onUndo: () => useCanvas.getState().undo(),
    onRedo: () => useCanvas.getState().redo(),
    onPaste: (r) => applyPaste(r),
  });

  if (!doc) return null;
  const slide = fitSlide(box.width - 32, box.height - 32);
  // 무대 안에서 슬라이드 위치 (가운데 정렬)
  const slideLeft = (box.width - slide.width) / 2;
  const slideTop = (box.height - slide.height) / 2;
  const overTrash = !!dragAt && inRect(dragAt, trashBox);

  /** 글자 입력 시작: 새 글자는 (x,y) 자리에, 있던 글자는 그 자리에서 */
  // 가로는 글자 상자가 슬라이드 안에 들어오게 맞춘다
  const startText = (at: { x: number; y: number }) =>
    setEditing({
      el: {
        ...textBase,
        id: newElementId(),
        kind: 'text',
        text: '',
        x: Math.min(1 - textBase.w / 2, Math.max(textBase.w / 2, at.x)),
        y: at.y,
      },
      isNew: true,
    });

  /** 빈 곳 누름: 고른 게 있으면 해제, 없으면 그 자리에 새 글자 (인스타 스토리) */
  const onStagePress = (e: GestureResponderEvent) => {
    if (Date.now() - touchedAt.current < 300) return; // 요소를 누른 같은 터치
    if (tool !== 'select') return;
    if (selectedId) return select(null);
    const { pageX, pageY } = e.nativeEvent;
    stageRef.current?.measureInWindow((sx, sy) =>
      startText(
        tapToSlide(
          { x: pageX, y: pageY },
          { x: sx + slideLeft, y: sy + slideTop, width: slide.width, height: slide.height },
        ),
      ),
    );
  };
  const selected = doc.elements.find((e) => e.id === selectedId) ?? null;

  const pickBackgroundPhoto = () =>
    pickCanvasVisual().then((v) => {
      if (!v) return;
      if (v.kind === 'gif') return toast('배경은 사진만 쓸 수 있어요.');
      const cur = useCanvas.getState().doc!;
      useCanvas.getState().commit({ ...cur, background: { kind: 'image', uri: v.uri } });
    });

  const handleTool = (t: ToolKey) => {
    switch (t) {
      case 'paste':
        readClipboard().then(applyPaste);
        break;
      case 'pen':
        setTool('pen');
        break;
      case 'text':
        select(null);
        startText({ x: 0.5, y: 0.5 });
        break;
      case 'photo':
      case 'gif': {
        // 같은 앨범 선택기에서 사진·GIF 를 판별한다
        if (t === 'gif') {
          const err = canAdd(doc, 'gif');
          if (err) return toast(LIMIT_MESSAGE[err]);
        }
        pickCanvasVisual().then((v) => {
          if (!v) return;
          const base = { id: newElementId(), x: 0.5, y: 0.5, w: 0.6, rotation: 0, uri: v.uri, aspect: v.aspect };
          add(v.kind === 'gif' ? { ...base, kind: 'gif' } : { ...base, kind: 'image', shape: 'rect' });
        });
        break;
      }
      case 'video': {
        const err = canAdd(doc, 'video');
        if (err) return toast(LIMIT_MESSAGE[err]);
        pickCanvasVideo().then((v) => {
          if (!v) return;
          add({
            id: newElementId(),
            kind: 'video',
            x: 0.5,
            y: 0.5,
            w: 0.6,
            rotation: 0,
            uri: v.uri,
            aspect: v.aspect,
            durationMs: v.durationMs,
          });
        });
        break;
      }
      case 'sticker':
      case 'bind':
      case 'background':
        setPicker(t);
        break;
      default:
        toast('준비 중이에요.');
    }
  };

  const handleCommand = (c: PropertyCommand) => {
    if (!selected) return;
    if (c === 'delete') commit(removeElement(doc, selected.id));
    if (c === 'front' || c === 'back') commit(reorderElement(doc, selected.id, c));
    if (c === 'duplicate') {
      const err = canAdd(doc, selected.kind);
      if (err) return toast(LIMIT_MESSAGE[err]);
      const r = duplicateElement(doc, selected.id);
      commit(r.doc);
      select(r.id);
    }
    if (c === 'replace' && selected.kind === 'image') {
      pickCanvasVisual().then((v) => {
        const cur = useCanvas.getState().doc!;
        if (v?.kind === 'image')
          useCanvas.getState().commit(updateElement(cur, selected.id, { uri: v.uri, aspect: v.aspect }));
        else if (v) toast('사진만 교체할 수 있어요.');
      });
    }
    if (c === 'edit') {
      if (selected.kind === 'text') setEditing({ el: selected, isNew: false });
      if (selected.kind === 'bound') setBoundNotice(true);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.top, dragAt && styles.ghost]} pointerEvents={dragAt ? 'none' : 'auto'}>
        <Pressable
          onPress={() => (past.length ? setConfirmCancel(true) : onCancel())}
          hitSlop={10}
          accessibilityLabel="꾸미기 취소"
        >
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
        <View style={styles.topMid}>
          <Pressable onPress={undo} disabled={!past.length} hitSlop={8} accessibilityLabel="되돌리기">
            <Ionicons name="arrow-undo-outline" size={22} color={past.length ? colors.inkSoft : colors.placeholder} />
          </Pressable>
          <Pressable onPress={redo} disabled={!future.length} hitSlop={8} accessibilityLabel="다시하기">
            <Ionicons name="arrow-redo-outline" size={22} color={future.length ? colors.inkSoft : colors.placeholder} />
          </Pressable>
        </View>
        <Button label="완료" variant="chip" onPress={() => onDone(doc)} />
      </View>
      <View style={dragAt && styles.ghost} pointerEvents={dragAt ? 'none' : 'auto'}>
        <CanvasToolbar onTool={handleTool} active={tool === 'select' ? null : 'pen'} />
      </View>

      <Pressable
        ref={stageRef}
        style={[styles.flex, styles.stage]}
        onPress={onStagePress}
        accessible={false}
        onLayout={(e) =>
          setBox({
            width: Math.round(e.nativeEvent.layout.width),
            height: Math.round(e.nativeEvent.layout.height),
            y: Math.round(e.nativeEvent.layout.y),
          })
        }
      >
        {box.width > 0 && (
          <CanvasSlide
            doc={doc}
            content={content}
            templateBg={style.bg}
            width={slide.width}
            renderElement={(el) => (
              <EditableElement
                el={el}
                content={content}
                slideW={slide.width}
                selected={el.id === selectedId}
                interactive={tool === 'select' || (tool === 'eraser' && el.kind === 'stroke')}
                onSelect={() => {
                  touchedAt.current = Date.now();
                  // 지우개 모드: 누른 선을 바로 지운다
                  if (tool === 'eraser') {
                    if (el.kind === 'stroke') commit(removeElement(useCanvas.getState().doc!, el.id));
                    return;
                  }
                  select(el.id);
                }}
                onCommit={(next) => commit(updateElement(doc, el.id, next))}
                onGuides={setGuides}
                onTap={() => {
                  if (tool !== 'select') return;
                  if (el.kind === 'text') setEditing({ el, isNew: false });
                  if (el.kind === 'bound') setBoundNotice(true);
                }}
                onDrag={(p) => {
                  // 끌기 시작에 휴지통 위치를 잰다 (보이기 전이라도 자리는 잡혀 있다)
                  if (p && !dragAt)
                    trashRef.current?.measureInWindow(
                      (x, y, width, height) => {
                        trashRect.current = { x, y, width, height };
                        setTrashBox(trashRect.current);
                      },
                    );
                  dragRef.current = p;
                  setDragAt(p);
                }}
                overTrash={() => !!dragRef.current && inRect(dragRef.current, trashRect.current)}
                onDelete={() => commit(removeElement(useCanvas.getState().doc!, el.id))}
                hidden={editing?.el.id === el.id}
                dropping={overTrash && el.id === selectedId}
              />
            )}
            overlay={
              <>
                <Guides x={guides.x} y={guides.y} slideW={slide.width} slideH={slide.height} />
                {editing && <View style={StyleSheet.absoluteFill} />}
                {tool === 'pen' && (
                  <PenLayer
                    slideW={slide.width}
                    slideH={slide.height}
                    color={penColor}
                    widthPx={(penWidth / 360) * slide.width}
                    onStroke={(pts) => {
                      const stroke = strokeFromPoints(pts, slide.width, penColor, (penWidth / 360) * slide.width);
                      if (stroke) add(stroke);
                      // 그린 직후 선택 상태로 두지 않는다 (계속 그리기)
                      select(null);
                    }}
                  />
                )}
              </>
            }
          />
        )}
        {/* 끄는 동안 아래 가운데 휴지통 — 자리는 늘 잡아 두고(측정용) 끌 때만 보인다 */}
        <View pointerEvents="none" style={styles.trashWrap}>
          <View ref={trashRef} style={[styles.trash, !dragAt && styles.invisible, overTrash && styles.trashOn]}>
            <Ionicons name="trash-outline" size={overTrash ? 28 : 24} color={overTrash ? '#FFFFFF' : colors.inkSoft} />
          </View>
        </View>
      </Pressable>

      <View style={styles.panel}>
        {tool === 'select' && !selected && (
          <View style={styles.panelHint}>
            <Txt variant="caption" color={colors.muted} align="center">
              빈 곳을 누르면 그 자리에 글자를 쓸 수 있어요.
            </Txt>
            <Txt variant="caption" color={colors.muted} align="center">
              요소는 끌어서 옮기고, 아래 휴지통에 놓으면 지워져요.
            </Txt>
          </View>
        )}
        {tool !== 'select' && (
          <PenOptions
            colors={colorsList}
            color={penColor}
            width={penWidth}
            tool={tool}
            onColor={setPenColor}
            onWidth={setPenWidth}
            onTool={setTool}
            onClose={() => setTool('select')}
          />
        )}
        {selected && tool === 'select' && (
          <PropertyBar
            el={selected}
            colors={colorsList}
            onChange={(patch) => commit(updateElement(doc, selected.id, patch))}
            onCommand={handleCommand}
          />
        )}
      </View>

      <StickerPicker
        visible={picker === 'sticker'}
        onClose={() => setPicker(null)}
        onPick={(icon) => {
          setPicker(null);
          add({ id: newElementId(), kind: 'sticker', icon, aspect: 1, x: 0.5, y: 0.5, w: 0.25, rotation: 0 });
        }}
        onPickSymbol={(symbol) => {
          setPicker(null);
          add({
            ...textBase,
            id: newElementId(),
            kind: 'text',
            text: symbol,
            w: 0.3,
            size: 40 / 360,
            color: style.accent,
          });
        }}
      />
      <BindPicker
        visible={picker === 'bind'}
        binds={bindsFor(themeId)}
        themeId={themeId}
        onClose={() => setPicker(null)}
        onPick={(bind) => {
          setPicker(null);
          add({ ...textBase, id: newElementId(), kind: 'bound', bind });
        }}
      />
      <BackgroundPicker
        visible={picker === 'background'}
        colors={colorsList}
        current={doc.background}
        onClose={() => setPicker(null)}
        onTemplate={() => commit({ ...doc, background: { kind: 'template' } })}
        onColor={(color) => commit({ ...doc, background: { kind: 'color', color } })}
        onPhoto={() => {
          setPicker(null);
          pickBackgroundPhoto();
        }}
      />
      <AppModal
        visible={boundNotice}
        message={'이 글자는 기본 정보와 연결돼 있어요.\n기본 정보에서 바꿀 수 있어요.'}
        onDismiss={() => setBoundNotice(false)}
        actions={[
          { label: '닫기', variant: 'outline', onPress: () => setBoundNotice(false) },
          {
            label: '기본 정보 열기',
            onPress: () => {
              setBoundNotice(false);
              // 지금까지 꾸민 내용은 저장하고 연다
              onDone(doc);
              onOpenBasic();
            },
          },
        ]}
      />
      <AppModal
        visible={confirmCancel}
        message="꾸민 내용을 저장하지 않고 나갈까요?"
        onDismiss={() => setConfirmCancel(false)}
        actions={[
          { label: '계속 꾸미기', variant: 'outline', onPress: () => setConfirmCancel(false) },
          {
            label: '나가기',
            onPress: () => {
              setConfirmCancel(false);
              onCancel();
            },
          },
        ]}
      />
      {/* 그 자리 글자 입력: 편집기 전체를 덮어 어디를 눌러도 마친다 */}
      {editing && (
        <InlineTextEditor
          el={editing.el}
          slide={{ left: slideLeft, top: box.y + slideTop, width: slide.width }}
          chromeHeight={box.y}
          colors={colorsList}
          onDone={(el, text) => {
            const cur = useCanvas.getState().doc!;
            if (editing.isNew) {
              const err = canAdd(cur, 'text');
              if (err && text.trim()) toast(LIMIT_MESSAGE[err]);
              else {
                const next = finishTextEdit(cur, el, true, text);
                if (next !== cur) {
                  commit(next);
                  select(el.id);
                }
              }
            } else {
              const next = finishTextEdit(cur, el, false, text);
              const before = cur.elements.find((x) => x.id === el.id);
              const after = next.elements.find((x) => x.id === el.id);
              if (JSON.stringify(before) !== JSON.stringify(after)) commit(next);
            }
            setEditing(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  topMid: { flexDirection: 'row', gap: spacing.xl },
  stage: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  ghost: { opacity: 0 },
  invisible: { opacity: 0 },
  panel: {
    height: PANEL_H,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    overflow: 'hidden',
  },
  panelHint: { padding: spacing.lg, gap: 4 },
  trashWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  trash: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  trashOn: { backgroundColor: colors.danger, borderColor: colors.danger, transform: [{ scale: 1.2 }] },
});
