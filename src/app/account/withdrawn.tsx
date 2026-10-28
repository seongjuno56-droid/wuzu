import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Wordmark } from '../../components/brand/Wordmark';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { colors, radius, spacing } from '../../theme';

/** 회원탈퇴 완료 → [확인] 홈 */
export default function WithdrawnScreen() {
  const home = () => {
    // 탈퇴 전 화면(회원정보 등)이 스택에 남지 않게 정리한 뒤 홈으로
    if (router.canDismiss()) router.dismissAll();
    router.replace('/home');
  };
  return (
    <Screen header={<Header title="회원탈퇴 완료" hideBack />} contentStyle={styles.content}>
      <View style={styles.logo}>
        <Wordmark size={48} />
        <Txt variant="caption" color={colors.muted}>
          우리를 만나게 할 단 한 장의 마법
        </Txt>
      </View>
      <Txt variant="title" align="center">
        회원 탈퇴 처리 되었습니다.
      </Txt>
      <Txt color={colors.muted} align="center">
        그동안 WUZU를 이용해주셔서 감사합니다.
      </Txt>
      <Button label="확인" variant="outline" onPress={home} style={styles.btn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.md },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  btn: { marginTop: spacing.xl },
});
