import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../components/Txt';
import { appColumn, colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { screenStatus } from '../invitation/status';

export type MoreAction = 'history' | 'rename' | 'edit' | 'delete';

const ITEMS: { key: MoreAction; label: string }[] = [
  { key: 'history', label: '이력 열람' },
  { key: 'rename', label: '초대장 이름 수정' },
  { key: 'edit', label: '초대장 수정' },
  { key: 'delete', label: '삭제' },
];

/** ⋮ 더보기: 사용불가 초대장은 이력 열람·삭제만 */
export function MoreSheet({
  invitation,
  visible,
  onSelect,
  onClose,
}: {
  invitation: Invitation | null;
  visible: boolean;
  onSelect: (a: MoreAction) => void;
  onClose: () => void;
}) {
  if (!invitation) return null;
  const blocked = screenStatus(invitation) === 'blocked';
  const items = blocked ? ITEMS.filter((i) => i.key === 'history' || i.key === 'delete') : ITEMS;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <View style={styles.head}>
              <Txt variant="tiny" color={colors.faint}>
                초대장No. {invitation.number}
              </Txt>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
                <Ionicons name="close" size={24} color={colors.inkSoft} />
              </Pressable>
            </View>
            <Txt variant="caption" color={colors.muted} align="center">
              - 결혼식 초대장 -
            </Txt>
            <Txt variant="title" align="center">
              {invitation.name}
            </Txt>
            {items.map((i) => (
              <Pressable key={i.key} onPress={() => onSelect(i.key)} style={styles.item} accessibilityRole="button">
                <Txt align="center">{i.label}</Txt>
              </Pressable>
            ))}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim, justifyContent: 'flex-end' },
  sheet: { ...appColumn, backgroundColor: colors.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  inner: { padding: spacing.xl, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item: { paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.xs },
});
