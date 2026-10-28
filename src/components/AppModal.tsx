import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary' | 'tint';
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  /** 제목 위 일러스트/아이콘 */
  art?: ReactNode;
  children?: ReactNode;
  actions: ModalAction[];
  /** 바깥 영역을 눌러 닫을 때 호출. 없으면 바깥 클릭 무시 */
  onDismiss?: () => void;
}

export function AppModal({ visible, title, message, art, children, actions, onDismiss }: Props) {
  // 버튼 문구가 길면 나란히 두면 줄바꿈되므로 세로로 쌓는다 (주 버튼이 위)
  const stacked = actions.some((a) => a.label.length > 8);
  const ordered = stacked ? [...actions].reverse() : actions;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.dim} onPress={onDismiss} accessibilityLabel="닫기">
        <Pressable style={styles.card} onPress={() => {}}>
          {art && <View style={styles.art}>{art}</View>}
          {title && (
            <Txt variant="title" align="center">
              {title}
            </Txt>
          )}
          {message && (
            <Txt color={colors.muted} align="center">
              {message}
            </Txt>
          )}
          {children}
          <View style={[styles.actions, stacked && styles.stacked]}>
            {ordered.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                onPress={a.onPress}
                variant={a.variant ?? 'primary'}
                size="md"
                style={stacked ? undefined : styles.action}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.canvas,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  art: { alignItems: 'center', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1 },
  stacked: { flexDirection: 'column' },
});
