import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../components/Txt';
import { appColumn, colors, radius, spacing } from '../../theme';
import { invitationKind } from '../../data/themes';
import { themeDef } from '../invitation/themes';
import type { Invitation } from '../invitation/model';
import { screenStatus } from '../invitation/status';

export type MoreAction = 'rsvp' | 'history' | 'rename' | 'edit' | 'delete';

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
  rsvpCount,
  onSelect,
  onClose,
}: {
  invitation: Invitation | null;
  visible: boolean;
  /** 받은 참석 응답 수 (모임) */
  rsvpCount?: number;
  onSelect: (a: MoreAction) => void;
  onClose: () => void;
}) {
  if (!invitation) return null;
  const blocked = screenStatus(invitation) === 'blocked';
  const base = blocked ? ITEMS.filter((i) => i.key === 'history' || i.key === 'delete') : ITEMS;
  // 방명록과 참석 여부를 둘 다 쓰는 테마(모임)는 카드 버튼 줄이 차 있어 참석 응답을 여기에 둔다
  const def = themeDef(invitation.themeId);
  const both = ['guestbook', 'rsvp'].every((k) => def.optional.some((s) => s.key === k));
  const items =
    both && invitation.enabled.rsvp && !blocked
      ? [{ key: 'rsvp' as const, label: `참석 응답 (${rsvpCount ?? 0})` }, ...base]
      : base;
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
              {`- ${invitationKind(invitation.themeId)} -`}
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
