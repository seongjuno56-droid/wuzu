import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { BottomCTA } from '../../components/BottomCTA';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { confirmMessage, passwordMessage } from '../../lib/fieldMessages';
import { isValidPassword, PASSWORD_HINT } from '../../lib/validators';
import { authService } from '../../services';
import { spacing } from '../../theme';

export default function ResetPassword() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!email) return <Redirect href="/auth/find?tab=pw" />;

  const valid = isValidPassword(password) && password === confirm;
  const submit = async () => {
    setLoading(true);
    try {
      await authService.resetPassword(email, password);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<Header title="비밀번호 재설정 하기" />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="비밀번호 변경 완료" disabled={!valid} loading={loading} onPress={submit} />
        </BottomCTA>
      }
    >
      <TextField
        label="변경 비밀번호"
        placeholder={PASSWORD_HINT}
        value={password}
        onChangeText={setPassword}
        secureToggle
        message={passwordMessage(password)}
        maxLength={20}
      />
      <TextField
        label="변경 비밀번호 확인"
        placeholder="비밀번호를 한 번 더 입력해 주세요."
        value={confirm}
        onChangeText={setConfirm}
        secureToggle
        message={confirmMessage(password, confirm)}
        maxLength={20}
      />
      <AppModal
        visible={done}
        message={'비밀번호가\n정상적으로 변경되었습니다.'}
        actions={[{ label: '로그인 하기', onPress: () => router.dismissTo('/auth/login') }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
});
