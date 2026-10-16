import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { SortableGrid } from '../../../components/SortableGrid';
import { Txt } from '../../../components/Txt';
import { useEditor } from '../../../features/invitation/editorStore';
import { PAGE_LABEL, PageKey, ReorderablePage } from '../../../features/invitation/model';
import { useDraft } from '../../../features/invitation/useDraft';
import { colors, radius, spacing } from '../../../theme';

const ROW_HEIGHT = 56;

function FixedRow({ page }: { page: PageKey }) {
  return (
    <View style={[styles.row, styles.fixed]}>
      <Txt variant="bodyStrong" style={styles.flex}>
        {PAGE_LABEL[page]}
      </Txt>
      <Ionicons name="lock-closed-outline" size={16} color={colors.placeholder} />
    </View>
  );
}

/** Step 4. 페이지 순서 변경 — 표지·인사말·엔딩은 고정, 나머지는 드래그 */
export default function EditorOrder() {
  const draft = useDraft();
  const setOrder = useEditor((s) => s.setOrder);
  const [dragging, setDragging] = useState(false);
  if (!draft) return <Redirect href="/create" />;

  const visible = draft.order.filter((p) => p === 'ceremony' || draft.enabled[p]);
  const hidden = draft.order.filter((p) => !visible.includes(p));

  return (
    <Screen
      header={<Header title="페이지 순서 변경" />}
      background={colors.surface}
      scrollEnabled={!dragging}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <View style={styles.actions}>
            <Button label="이전" variant="outline" style={styles.flex} onPress={() => router.back()} />
            <Button label="정보 입력" style={styles.wide} onPress={() => router.push('/create/editor/compose')} />
          </View>
        </BottomCTA>
      }
    >
      <Txt variant="caption" color={colors.muted} align="center" style={styles.hint}>
        ☰ 를 끌어서 페이지 순서를 바꿀 수 있어요.
      </Txt>
      <FixedRow page="cover" />
      <FixedRow page="greeting" />
      <SortableGrid<ReorderablePage>
        items={visible}
        keyOf={(p) => p}
        columns={1}
        itemHeight={ROW_HEIGHT}
        gap={spacing.sm}
        onDragChange={setDragging}
        onChange={(next) => setOrder([...next, ...hidden])}
        renderItem={(page, { handle, dragging: active }) => (
          <View style={[styles.row, active && styles.active]}>
            <Txt variant="bodyStrong" style={styles.flex}>
              {PAGE_LABEL[page]}
            </Txt>
            <View {...handle} style={styles.handle} accessibilityLabel={`${PAGE_LABEL[page]} 순서 이동`}>
              <Ionicons name="reorder-three" size={26} color={colors.muted} />
            </View>
          </View>
        )}
      />
      {draft.enabled.ending && <FixedRow page="ending" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wide: { flex: 2 },
  content: { padding: spacing.lg, gap: spacing.sm },
  hint: { paddingVertical: spacing.sm },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  fixed: { paddingRight: spacing.lg, backgroundColor: colors.surface },
  active: { borderColor: colors.inkSoft },
  handle: { height: '100%', paddingHorizontal: spacing.lg, justifyContent: 'center', cursor: 'grab' } as object,
  actions: { flexDirection: 'row', gap: spacing.sm },
});
