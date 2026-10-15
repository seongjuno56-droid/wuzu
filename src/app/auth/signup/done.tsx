import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Envelope } from '../../../components/brand/Envelope';
import { Stamp } from '../../../components/brand/Stamp';
import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { goHome } from '../../../lib/nav';
import { useSession } from '../../../store/session';
import { useSignupDraft } from '../../../store/signupDraft';
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
          <Button label="wuzu 시작하기" onPress={finish} />
        </BottomCTA>
      }
    >
      <View style={styles.art}>
        <Envelope width={168} />
        <Stamp width={44} height={54} rotate={8} backdrop={colors.canvas} style={styles.stamp}>
          <Ionicons name="heart" size={20} color={colors.canvas} />
        </Stamp>
      </View>
      <Txt variant="headline" align="center">
        {name ? `${name}님, ` : ''}가입을 환영해요
      </Txt>
      <Txt color={colors.muted} align="center">
        지금 바로 첫 초대장을 만들어 보세요.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  art: { marginBottom: spacing.xxl },
  stamp: { position: 'absolute', top: -14, right: -10 },
});
