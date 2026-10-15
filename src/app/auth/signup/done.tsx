import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { goHome } from '../../../lib/nav';
import { useSignupDraft } from '../../../store/signupDraft';
import { useSession } from '../../../store/session';
import { colors, spacing } from '../../../theme';

export default function SignupDone() {
  const name = useSession((s) => s.user?.name);
  const finish = () => {
    useSignupDraft.getState().reset();
    goHome();
  };
  return (
    <Screen
      scroll={false}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="WUZU 서비스 둘러보기" onPress={finish} />
        </BottomCTA>
      }
    >
      <View style={styles.badge}>
        <Ionicons name="mail-open" size={56} color={colors.primary} />
        <View style={styles.spark}>
          <Ionicons name="sparkles" size={24} color={colors.accent} />
        </View>
      </View>
      <Txt variant="title" align="center">
        {name ? `${name}님, ` : ''}wuzu의 회원이 된 걸{'\n'}진심으로 환영해요
      </Txt>
      <Txt color={colors.textSub} align="center">
        지금부터 wuzu와 함께{'\n'}나만의 초대장을 만들어 보세요!
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: spacing.xl },
  badge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  spark: { position: 'absolute', top: 14, right: 14 },
});
