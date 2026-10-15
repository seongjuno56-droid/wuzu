import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppModal } from '../AppModal';
import { Txt } from '../Txt';

interface Props {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

const ITEMS = [
  { title: '새로운 소식 알림', body: '업데이트 및 새로운 소식' },
  { title: '이벤트 알림', body: '할인소식이나 각종 이벤트에 대한 소식' },
];

export function PushConsentModal({ visible, onAgree, onDecline }: Props) {
  return (
    <AppModal
      visible={visible}
      title="APP PUSH 알림 수신 동의"
      actions={[
        { label: '동의 안함', onPress: onDecline, variant: 'outline' },
        { label: '동의', onPress: onAgree },
      ]}
    >
      <View style={styles.list}>
        <Txt variant="caption" weight="semibold" color={colors.textSub}>
          [APP PUSH 설정 시]
        </Txt>
        {ITEMS.map((it) => (
          <View key={it.title} style={styles.item}>
            <Txt variant="bodyStrong" weight="semibold" color={colors.primary}>
              • {it.title}
            </Txt>
            <Txt variant="caption" color={colors.textSub}>
              {it.body}
            </Txt>
          </View>
        ))}
        <Txt variant="tiny" color={colors.textMuted}>
          PUSH 알림은 마이페이지 &gt; 앱 설정에서 변경 가능합니다.
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingVertical: spacing.sm },
  item: { gap: 2 },
});
