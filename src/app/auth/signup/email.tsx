import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { SignupStepHeader } from '../../../features/auth/SignupStepHeader';
import { Screen } from '../../../components/Screen';
import { FieldMessage, TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { useSignupGuard } from '../../../features/auth/useSignupGuard';
import { emailFormatMessage } from '../../../lib/fieldMessages';
import { isValidEmail, normalizeEmail } from '../../../lib/validators';
import { authService } from '../../../services';
import { useSignupDraft } from '../../../store/signupDraft';
import { colors, spacing } from '../../../theme';

type Availability = 'idle' | 'checking' | 'available' | 'taken';
const CHECK_DELAY_MS = 400;

export default function SignupEmail() {
  const draft = useSignupGuard();
  const patch = useSignupDraft((s) => s.patch);
  const [email, setEmail] = useState(draft.email ?? '');
  const [availability, setAvailability] = useState<Availability>('idle');

  useEffect(() => {
    if (!isValidEmail(email)) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const taken = await authService.isEmailTaken(email);
      if (!cancelled) setAvailability(taken ? 'taken' : 'available');
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email]);

  const message: FieldMessage =
    emailFormatMessage(email) ??
    (availability === 'taken'
      ? { type: 'error', text: '이미 가입된 이메일입니다.' }
      : availability === 'available'
        ? { type: 'success', text: '사용 가능한 이메일입니다.' }
        : null);

  const next = () => {
    patch({ email: normalizeEmail(email) });
    router.push('/auth/signup/password');
  };

  return (
    <Screen
      header={
        <SignupStepHeader
          step="email"
          title={'사용하실 이메일을\n입력해 주세요'}
          description="이메일은 로그인 아이디로 사용돼요."
        />
      }
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="다음" disabled={availability !== 'available'} onPress={next} />
        </BottomCTA>
      }
    >
      <TextField
        label="이메일"
        placeholder="example@wuzu.kr"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        message={message}
        clearable
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
});
