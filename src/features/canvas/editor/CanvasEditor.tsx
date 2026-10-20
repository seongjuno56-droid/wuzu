import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  canAdd,
  duplicateElement,
  fitSlide,
  LIMIT_MESSAGE,
  newElementId,
  palette,
  removeElement,
  reorderElement,
  updateElement,
} from '../model';
import { CanvasSlide } from '../render/CanvasSlide';
import type { CanvasDoc, CanvasElement } from '../types';
import { CanvasToolbar, ToolKey } from './CanvasToolbar';
import { EditableElement } from './EditableElement';
import { Guides } from './Guides';
import { PropertyBar, PropertyCommand } from './PropertyBar';
import { TextEditModal } from './TextEditModal';

export interface CanvasEditorProps {
  initial: CanvasDoc;
  content: InvitationContent;
  style: TemplateStyle;
  onDone: (doc: CanvasDoc) => void;
  onCancel: () => void;
  /** 연결 텍스트 수정 시 [기본정보 열기] */
  onOpenBasic: () => void;
}

/** 캔버스 편집기: 상단 바(취소·되돌리기·다시하기·완료) → 도구 줄 → 슬라이드 → 속성 바 */
export function CanvasEditor({ initial, content, style, onDone, onCancel, onOpenBasic }: CanvasEditorProps) {
  const { doc, selectedId, tool, past, future, open, close, select, commit, undo, redo } = useCanvas();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });
  const [textModal, setTextModal] = useState<{ id: string | null; text: string } | null>(null);
  const [boundNotice, setBoundNotice] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const colorsList = useMemo(() => palette(style), [style]);
  // 요소를 마지막으로 만진 시각 — 같은 터치의 배경 탭(선택 해제)을 무시하려고
  const touchedAt = useRef(0);

  useEffect(() => {
    open(initial);
    return () => close();
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!doc) return null;
  const slide = fitSlide(box.width - 32, box.height - 32);
  const selected = doc.elements.find((e) => e.id === selectedId) ?? null;

  /** 한도 검사 후 추가하고 선택 */
  const add = (el: CanvasElement) => {
    const err = canAdd(doc, el.kind);
    if (err) {
      toast(LIMIT_MESSAGE[err]);
      return;
    }
    commit(addElement(doc, el));
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

  const handleTool = (t: ToolKey) => {
    switch (t) {
      case 'text':
        setTextModal({ id: null, text: '' });
        break;
      // 아래 도구는 Task 10~13 에서 채운다
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
    if (c === 'edit') {
      if (selected.kind === 'text') setTextModal({ id: selected.id, text: selected.text });
      if (selected.kind === 'bound') setBoundNotice(true);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Pressable onPress={() => (past.length ? setConfirmCancel(true) : onCancel())} hitSlop={10} accessibilityLabel="꾸미기 취소">
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
      <CanvasToolbar onTool={handleTool} active={tool === 'select' ? null : 'pen'} />

      <Pressable
        style={[styles.flex, styles.stage]}
        // 요소를 누른 직후(300ms)의 배경 탭은 같은 터치이므로 무시
        onPress={() => Date.now() - touchedAt.current > 300 && select(null)}
        accessible={false}
        onLayout={(e) => setBox({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
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
                interactive={tool === 'select'}
                onSelect={() => {
                  touchedAt.current = Date.now();
                  select(el.id);
                }}
                onCommit={(next) => commit(updateElement(doc, el.id, next))}
                onGuides={setGuides}
                onDoubleTap={() => {
                  if (el.kind === 'text') setTextModal({ id: el.id, text: el.text });
                  if (el.kind === 'bound') setBoundNotice(true);
                }}
              />
            )}
            overlay={<Guides x={guides.x} y={guides.y} slideW={slide.width} slideH={slide.height} />}
          />
        )}
      </Pressable>

      {selected && tool === 'select' && (
        <PropertyBar
          el={selected}
          colors={colorsList}
          onChange={(patch) => commit(updateElement(doc, selected.id, patch))}
          onCommand={handleCommand}
        />
      )}

      <TextEditModal
        visible={!!textModal}
        initial={textModal?.text ?? ''}
        onCancel={() => setTextModal(null)}
        onDone={(text) => {
          if (textModal?.id) commit(updateElement(doc, textModal.id, { text } as Partial<CanvasElement>));
          else add({ ...textBase, id: newElementId(), kind: 'text', text });
          setTextModal(null);
        }}
      />
      <AppModal
        visible={boundNotice}
        message={'이 글자는 기본정보와 연결돼 있어요.\n기본정보에서 바꿀 수 있어요.'}
        onDismiss={() => setBoundNotice(false)}
        actions={[
          { label: '닫기', variant: 'outline', onPress: () => setBoundNotice(false) },
          {
            label: '기본정보 열기',
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
          { label: '나가기', onPress: () => { setConfirmCancel(false); onCancel(); } },
        ]}
      />
      <Txt variant="tiny" color={colors.faint} align="center" style={styles.hint}>
        두 손가락으로 크기·회전, 손잡이로도 바꿀 수 있어요.
      </Txt>
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
  hint: { paddingVertical: 4, backgroundColor: colors.surface },
});
