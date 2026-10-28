import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../components/BottomCTA';
import { Button } from '../../components/Button';
import { FieldMessage, TextField } from '../../components/TextField';
import { Txt } from '../../components/Txt';
import { formatRemaining } from '../../lib/format';
import { isValidEmail, normalizeEmail } from '../../lib/validators';
import { authService, MAX_SEND, MOCK_CODE } from '../../services';
import { colors, spacing } from '../../theme';

type Step = 'input' | 'sent' | 'verified';

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function FindPasswordForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [expiresAt, setExpiresAt] = useState(0);
  const [emailMsg, setEmailMsg] = useState<FieldMessage>(null);
  const [codeMsg, setCodeMsg] = useState<FieldMessage>(null);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const now = useNow(step === 'sent');
  const remaining = expiresAt - now;
  const expired = step === 'sent' && remaining <= 0;

  const send = async () => {
    setBusy('send');
    try {
      const r = await authService.sendCode(email);
      if (!r.ok) {
        setEmailMsg(
          r.reason === 'not_found'
            ? { type: 'error', text: '가입되지 않은 이메일입니다.' }
            : { type: 'error', text: '발송 횟수를 초과했어요. 5분 후 재발송 할 수 있습니다.' },
        );
        return;
      }
      setStep('sent');
      setExpiresAt(r.expiresAt);
      setCode('');
      setCodeMsg(null);
      setEmailMsg({ type: 'info', text: `인증메일을 발송했습니다. (${r.sentCount}/${MAX_SEND})` });
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    try {
      if (await authService.verifyCode(email, code)) {
        setStep('verified');
        setCodeMsg({ type: 'success', text: '인증되었습니다.' });
      } else {
        setCodeMsg({ type: 'error', text: expired ? '인증 시간이 만료되었습니다. 다시 발송해 주세요.' : '인증번호가 일치하지 않습니다.' });
      }
    } finally {
      setBusy(null);
    }
  };

  const changeEmail = (v: string) => {
    setEmail(v);
    if (step !== 'input') setStep('input');
    setEmailMsg(null);
    setCodeMsg(null);
  };

  return (
    <>
      <View style={styles.form}>
        <TextField
          label="이메일"
          placeholder="example@wuzu.kr"
          value={email}
          onChangeText={changeEmail}
          keyboardType="email-address"
          message={emailMsg}
          editable={step !== 'verified'}
          right={
            step !== 'verified' && (
              <Button
                label={step === 'sent' ? '재발송' : '인증번호 발송'}
                size="sm"
                variant="secondary"
                disabled={!isValidEmail(email)}
                loading={busy === 'send'}
                onPress={send}
              />
            )
          }
        />
        {step !== 'input' && (
          <TextField
            placeholder="인증번호 입력"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            message={expired && !codeMsg ? { type: 'error', text: '인증 시간이 만료되었습니다. 다시 발송해 주세요.' } : codeMsg}
            editable={step === 'sent'}
            right={
              step === 'sent' && (
                <View style={styles.codeRight}>
                  <Txt variant="caption" weight="semibold" color={expired ? colors.danger : colors.primary}>
                    {formatRemaining(remaining)}
                  </Txt>
                  <Button
                    label="인증 완료"
                    size="sm"
                    variant="secondary"
                    disabled={code.length !== 6 || expired}
                    loading={busy === 'verify'}
                    onPress={verify}
                  />
                </View>
              )
            }
          />
        )}
        {__DEV__ && step === 'sent' && (
          <Txt variant="tiny" color={colors.textMuted}>
            [개발용] 테스트 인증번호: {MOCK_CODE}
          </Txt>
        )}
      </View>
      <BottomCTA>
        <Button
          label="비밀번호 재설정 하기"
          disabled={step !== 'verified'}
          onPress={() =>
            router.push({ pathname: '/auth/reset-password', params: { email: normalizeEmail(email) } })
          }
        />
      </BottomCTA>
    </>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  codeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
