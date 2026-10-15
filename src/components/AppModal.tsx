import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  children?: ReactNode;
  actions: ModalAction[];
  /** 바깥 영역을 눌러 닫을 때 호출. 없으면 바깥 클릭 무시 */
  onDismiss?: () => void;
}

export function AppModal({ visible, title, message, children, actions, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.dim} onPress={onDismiss} accessibilityLabel="닫기">
        <Pressable style={styles.card} onPress={() => {}}>
          {title && (
            <Txt variant="subtitle" weight="bold" align="center">
              {title}
            </Txt>
          )}
          {message && (
            <Txt color={colors.textSub} align="center">
              {message}
            </Txt>
          )}
          {children}
          <View style={styles.actions}>
            {actions.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                onPress={a.onPress}
                variant={a.variant ?? 'primary'}
                size="md"
                style={styles.action}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
