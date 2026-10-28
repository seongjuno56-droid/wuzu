import { StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { EDIT_COST } from '../../wallet/pricing';
import type { Invitation } from '../model';

/** 활성화된 초대장 수정: 보유 레터를 보여주고 [수정 (레터 -5)] / [이전] */
export function EditPayModal({
  visible,
  invitation,
  balance,
  busy,
  onPay,
  onCancel,
}: {
  visible: boolean;
  invitation: Invitation;
  balance: number | null;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <AppModal
      visible={visible}
      onDismiss={onCancel}
      actions={[
        { label: '이전', variant: 'outline', onPress: onCancel },
        { label: busy ? '처리 중…' : `수정 (레터 -${EDIT_COST})`, onPress: onPay },
      ]}
    >
      <Txt variant="tiny" color={colors.faint}>
        초대장No. {invitation.number}
      </Txt>
      <Txt variant="caption" color={colors.muted} align="center">
        - 결혼식 초대장 -
      </Txt>
      <Txt variant="title" align="center">
        {invitation.name}
      </Txt>
      <View style={styles.balance}>
        <Txt weight="semibold" color={colors.canvas}>
          보유 레터 {balance ?? '–'}
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  balance: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
});
