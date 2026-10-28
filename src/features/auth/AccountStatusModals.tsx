import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Txt } from '../../components/Txt';
import { formatDate } from '../../lib/format';
import { goHome } from '../../lib/nav';
import { authService, SocialLoginResult, User } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

type Withdrawing = Extract<SocialLoginResult, { reason: 'withdrawing' }>;

/**
 * 간편 로그인 결과(SocialLoginResult)를 받아 성공 시 세션 저장 후 이동하고,
 * 탈퇴 신청/제재 계정이면 해당 모달을 띄운다.
 */
export function useLoginResultHandler(onSuccess: (user: User) => void = goHome) {
  const setUser = useSession((s) => s.setUser);
  const setNeedsOnboarding = useSession((s) => s.setNeedsOnboarding);
  const [withdrawing, setWithdrawing] = useState<Withdrawing | null>(null);
  const [banned, setBanned] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);

  /** 성공·제재·탈퇴 신청을 처리하면 true. 취소·실패는 false 를 돌려 호출한 쪽이 맡는다 */
  const handle = (result: SocialLoginResult): boolean => {
    if (result.ok) {
      setUser(result.user);
      // 처음 가입: 홈에서 생년월일·성별·마케팅 동의를 받는다 (설계: 최초 회원정보 기입 모달)
      if (result.isNew) setNeedsOnboarding(true);
      onSuccess(result.user);
      return true;
    }
    if (result.reason === 'withdrawing') {
      setCancelFailed(false);
      setWithdrawing(result);
    }
    else if (result.reason === 'banned') setBanned(true);
    else return false;
    return true;
  };

  /** 철회하지 않고 닫으면, 철회용으로 남겨 둔 세션을 끊는다 */
  const closeWithdrawing = async () => {
    if (!withdrawing || cancelling) return;
    setWithdrawing(null);
    try {
      await authService.logout();
    } catch {
      // 세션 정리 실패는 앱 다음 시작 때 다시 정리된다
    }
  };

  const cancelWithdraw = async () => {
    if (!withdrawing || cancelling) return;
    setCancelling(true);
    setCancelFailed(false);
    try {
      const user = await authService.cancelWithdraw(withdrawing.userId);
      setWithdrawing(null);
      setUser(user);
      onSuccess(user);
    } catch {
      // 모달은 그대로 두어 다시 누를 수 있게 한다 (토스트는 모달에 가려지므로 모달 안에 안내)
      setCancelFailed(true);
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
        onDismiss={closeWithdrawing}
        actions={[
          { label: '닫기', variant: 'outline', onPress: closeWithdrawing },
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
            {cancelFailed && (
              <Txt variant="caption" color={colors.danger} align="center">
                탈퇴를 철회하지 못했어요. 잠시 후 다시 시도해 주세요.
              </Txt>
            )}
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
