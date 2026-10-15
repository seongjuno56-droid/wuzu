import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppModal } from '../AppModal';
import { Txt } from '../Txt';

interface Props {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

const ITEMS = [
  { icon: 'megaphone-outline', title: '새로운 소식', body: '업데이트와 새 템플릿 소식' },
  { icon: 'pricetag-outline', title: '이벤트', body: '할인과 이벤트 소식' },
] as const;

export function PushConsentModal({ visible, onAgree, onDecline }: Props) {
  return (
    <AppModal
      visible={visible}
      title="앱 푸시 알림을 받으시겠어요?"
      actions={[
        { label: '동의 안함', onPress: onDecline, variant: 'outline' },
        { label: '동의', onPress: onAgree },
      ]}
    >
      <View style={styles.list}>
        {ITEMS.map((it) => (
          <View key={it.title} style={styles.item}>
            <Ionicons name={it.icon} size={20} color={colors.label} />
            <View style={styles.flex}>
              <Txt variant="caption" weight="semibold">
                {it.title}
              </Txt>
              <Txt variant="tiny" color={colors.muted}>
                {it.body}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <Txt variant="tiny" color={colors.faint} align="center">
        마이페이지 &gt; 앱 설정에서 언제든 바꿀 수 있어요.
      </Txt>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.sm, marginVertical: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
});
