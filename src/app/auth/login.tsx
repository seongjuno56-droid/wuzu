import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { FieldMessage, TextField } from '../../components/TextField';
import { Txt } from '../../components/Txt';
import { useLoginResultHandler } from '../../features/auth/AccountStatusModals';
import { goHome } from '../../lib/nav';
import { authService } from '../../services';
import { useSignupDraft } from '../../store/signupDraft';
import { colors, fonts, spacing } from '../../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FieldMessage>(null);
  const [loading, setLoading] = useState<'email' | 'kakao' | null>(null);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const { handle, modals } = useLoginResultHandler();
  const patchDraft = useSignupDraft((s) => s.patch);
  const resetDraft = useSignupDraft((s) => s.reset);

  const loginWithEmail = async () => {
    setError(null);
    setLoading('email');
    try {
      const result = await authService.login(email, password);
      if (!handle(result)) setError({ type: 'error', text: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    } finally {
      setLoading(null);
    }
  };

  const loginWithKakao = async () => {
    setLoading('kakao');
    try {
      const { result, profile } = await authService.socialLogin('kakao');
      if (result) {
        handle(result);
        return;
      }
      // 첫 카카오 로그인: 약관 동의 → 정보 확인 단계만 거쳐 가입
      resetDraft();
      patchDraft({ provider: 'kakao', providerKey: profile.providerKey, name: profile.name });
      router.push('/auth/signup/terms');
    } finally {
      setLoading(null);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <Screen header={<Header />} contentStyle={styles.content}>
      <View style={styles.brand}>
        <Txt style={styles.logo} color={colors.primary}>
          wuzu
        </Txt>
        <Txt color={colors.textSub}>우리를 만나게 할 단 한 장의 마법</Txt>
      </View>

      <View style={styles.section}>
        <Button
          variant="kakao"
          label="카카오로 시작하기"
          loading={loading === 'kakao'}
          icon={<Ionicons name="chatbubble" size={18} color={colors.kakaoText} />}
          onPress={loginWithKakao}
        />
        <View style={styles.socialRow}>
          <Button
            variant="social"
            label="Google"
            size="md"
            style={styles.flex}
            icon={<Ionicons name="logo-google" size={16} color={colors.text} />}
            onPress={() => setComingSoon('구글')}
          />
          <Button
            variant="social"
            label="Apple"
            size="md"
            style={styles.flex}
            icon={<Ionicons name="logo-apple" size={18} color={colors.text} />}
            onPress={() => setComingSoon('애플')}
          />
        </View>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Txt variant="caption" color={colors.textMuted}>
          또는 이메일로 로그인
        </Txt>
        <View style={styles.line} />
      </View>

      <View style={styles.section}>
        <TextField
          placeholder="이메일을 입력해 주세요."
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          clearable
        />
        <TextField
          placeholder="비밀번호를 입력해 주세요."
          value={password}
          onChangeText={setPassword}
          secureToggle
          message={error}
          onSubmitEditing={canSubmit ? loginWithEmail : undefined}
        />
        <Button label="로그인" disabled={!canSubmit} loading={loading === 'email'} onPress={loginWithEmail} />
        <Pressable onPress={() => router.push('/auth/find')} style={styles.link}>
          <Txt variant="caption" color={colors.textSub}>
            아이디 또는 비밀번호를 잊으셨나요?
          </Txt>
        </Pressable>
        {__DEV__ && (
          <View style={styles.devHint}>
            <Txt variant="tiny" color={colors.textSub}>
              [개발용 테스트 계정 · 비밀번호 wuzu1234!]{'\n'}정상 test@wuzu.kr · 탈퇴신청 leaving@wuzu.kr · 제재 banned@wuzu.kr
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <Button
          label="이메일로 회원가입"
          variant="outline"
          onPress={() => {
            resetDraft();
            patchDraft({ provider: 'email' });
            router.push('/auth/signup/intro');
          }}
        />
        <Pressable onPress={goHome} style={styles.link}>
          <Txt variant="caption" color={colors.textSub}>
            로그인 전에 먼저 구경할래요 &gt;
          </Txt>
        </Pressable>
        <Txt variant="tiny" color={colors.textMuted} align="center">
          가입을 진행한 경우, 이용약관과 개인정보 수집 및 이용에 대해 동의한 것으로 간주됩니다.
        </Txt>
      </View>

      {modals}
      <AppModal
        visible={!!comingSoon}
        title={`${comingSoon} 로그인`}
        message="2차 오픈 예정이에요. 조금만 기다려 주세요!"
        onDismiss={() => setComingSoon(null)}
        actions={[{ label: '확인', onPress: () => setComingSoon(null) }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxl },
  logo: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56, letterSpacing: -1.5 },
  section: { gap: spacing.md },
  socialRow: { flexDirection: 'row', gap: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  link: { alignSelf: 'center', padding: spacing.xs },
  bottom: { gap: spacing.md, marginTop: 'auto' },
  devHint: { backgroundColor: colors.accentSoft, borderRadius: 8, padding: spacing.sm },
});
