import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Txt } from '../../components/Txt';
import { formatDate } from '../../lib/format';
import { goHome } from '../../lib/nav';
import { authService, LoginResult, User } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

type Withdrawing = Extract<LoginResult, { reason: 'withdrawing' }>;

/**
 * 로그인 결과(LoginResult)를 받아 성공 시 세션 저장 후 이동하고,
 * 탈퇴 신청/제재 계정이면 해당 모달을 띄운다.
 */
export function useLoginResultHandler(onSuccess: (user: User) => void = goHome) {
  const setUser = useSession((s) => s.setUser);
  const [withdrawing, setWithdrawing] = useState<Withdrawing | null>(null);
  const [banned, setBanned] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /** invalid 결과면 false를 돌려 호출한 쪽이 오류 문구를 띄우게 한다 */
  const handle = (result: LoginResult): boolean => {
    if (result.ok) {
      setUser(result.user);
      onSuccess(result.user);
      return true;
    }
    if (result.reason === 'withdrawing') setWithdrawing(result);
    else if (result.reason === 'banned') setBanned(true);
    else return false;
    return true;
  };

  const cancelWithdraw = async () => {
    if (!withdrawing) return;
    setCancelling(true);
    try {
      const user = await authService.cancelWithdraw(withdrawing.userId);
      setWithdrawing(null);
      setUser(user);
      onSuccess(user);
    } finally {
      setCancelling(false);
    }
  };

  const modals = (
    <>
      <AppModal
        visible={!!withdrawing}
        title="탈퇴 신청 상태인 계정이에요"
        message={'회원탈퇴를 철회하시겠습니까?\n탈퇴 철회 후 정상적인 서비스 이용이 가능합니다.'}
        onDismiss={() => setWithdrawing(null)}
        actions={[
          { label: '닫기', variant: 'outline', onPress: () => setWithdrawing(null) },
          { label: cancelling ? '처리 중…' : '탈퇴 철회하기', onPress: cancelWithdraw },
        ]}
      >
        {withdrawing && (
          <View style={styles.dates}>
            <Txt variant="caption" color={colors.textSub} align="center">
              탈퇴 신청일 : {formatDate(withdrawing.requestedAt, '-')}
            </Txt>
            <Txt variant="caption" weight="semibold" color={colors.danger} align="center">
              {formatDate(withdrawing.cancelDeadline)}까지 철회 가능
            </Txt>
          </View>
        )}
      </AppModal>
      <AppModal
        visible={banned}
        message={'해당 계정은 관리자에 의해\n제재된 계정이므로 사용이 불가합니다.'}
        onDismiss={() => setBanned(false)}
        actions={[{ label: '닫기', onPress: () => setBanned(false) }]}
      />
    </>
  );

  return { handle, modals };
}

const styles = StyleSheet.create({
  dates: { gap: spacing.xs, paddingVertical: spacing.sm },
});
