import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { useCompleteSignup } from '../../../features/auth/useCompleteSignup';
import { useSignupGuard } from '../../../features/auth/useSignupGuard';
import { confirmMessage, passwordMessage } from '../../../lib/fieldMessages';
import { isValidPassword, PASSWORD_HINT } from '../../../lib/validators';
import { colors, radius, spacing } from '../../../theme';

export default function SignupPassword() {
  const draft = useSignupGuard();
  const { submit, submitting, error } = useCompleteSignup();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const valid = isValidPassword(password) && password === confirm;

  return (
    <Screen
      header={<Header />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          {error && (
            <Txt variant="caption" color={colors.danger} align="center">
              {error}
            </Txt>
          )}
          <Button
            label="가입 완료"
            disabled={!valid}
            loading={submitting}
            onPress={() => submit({ ...draft, password })}
          />
        </BottomCTA>
      }
    >
      <Txt variant="title">거의 다 왔어요!{'\n'}사용하실 비밀번호를 입력해 주세요.</Txt>
      <View style={styles.emailChip}>
        <Txt weight="medium" style={styles.flex} numberOfLines={1}>
          {draft.email}
        </Txt>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Txt variant="caption" color={colors.textSub} style={styles.underline}>
            다른 이메일인가요?
          </Txt>
        </Pressable>
      </View>
      <TextField
        label="비밀번호"
        placeholder={PASSWORD_HINT}
        value={password}
        onChangeText={setPassword}
        secureToggle
        message={passwordMessage(password)}
        maxLength={20}
      />
      <TextField
        label="비밀번호 확인"
        placeholder="비밀번호를 한 번 더 입력해 주세요."
        value={confirm}
        onChangeText={setConfirm}
        secureToggle
        message={confirmMessage(password, confirm)}
        maxLength={20}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  underline: { textDecorationLine: 'underline' },
});
