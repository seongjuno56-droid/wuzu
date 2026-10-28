import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Wordmark } from '../../components/brand/Wordmark';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { FieldMessage, TextField } from '../../components/TextField';
import { Txt } from '../../components/Txt';
import { useLoginResultHandler } from '../../features/auth/AccountStatusModals';
import { goHome } from '../../lib/nav';
import { authService } from '../../services';
import { useSession } from '../../store/session';
import { useSignupDraft } from '../../store/signupDraft';
import { colors, radius, spacing } from '../../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FieldMessage>(null);
  const [loading, setLoading] = useState<'email' | 'kakao' | null>(null);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const { handle, modals } = useLoginResultHandler();
  const patchDraft = useSignupDraft((s) => s.patch);
  const resetDraft = useSignupDraft((s) => s.reset);
  const setUser = useSession((s) => s.setUser);
  const setNeedsOnboarding = useSession((s) => s.setNeedsOnboarding);

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
      // 첫 카카오 로그인: 바로 가입하고, 홈에서 생년월일·성별·마케팅 동의를 받는다 (설계: 최초 회원정보 기입 모달)
      const user = await authService.signup({
        name: profile.name,
        provider: 'kakao',
        providerKey: profile.providerKey,
        marketingAgreed: false,
      });
      setUser(user);
      setNeedsOnboarding(true);
      goHome();
    } finally {
      setLoading(null);
    }
  };

  const startEmailSignup = () => {
    resetDraft();
    patchDraft({ provider: 'email' });
    router.push('/auth/signup/intro');
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <Screen header={<Header title="로그인" />} contentStyle={styles.content}>
      <View style={styles.brand}>
        <Wordmark size={40} />
        <Txt variant="caption" color={colors.muted}>
          우리를 만나게 할 단 한 장의 마법
        </Txt>
      </View>

      <View style={styles.section}>
        <Button
          variant="kakao"
          label="카카오로 시작하기"
          loading={loading === 'kakao'}
          icon={<Ionicons name="chatbubble" size={17} color={colors.kakaoText} />}
          onPress={loginWithKakao}
        />
        <View style={styles.socialRow}>
          <Button
            variant="outline"
            label="Google"
            size="md"
            style={styles.flex}
            icon={<Ionicons name="logo-google" size={15} color={colors.label} />}
            onPress={() => setComingSoon('구글')}
          />
          <Button
            variant="outline"
            label="Apple"
            size="md"
            style={styles.flex}
            icon={<Ionicons name="logo-apple" size={17} color={colors.label} />}
            onPress={() => setComingSoon('애플')}
          />
        </View>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Txt variant="tiny" color={colors.faint}>
          또는 이메일로 로그인
        </Txt>
        <View style={styles.line} />
      </View>

      <View style={styles.section}>
        <TextField
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          clearable
        />
        <TextField
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureToggle
          message={error}
          onSubmitEditing={canSubmit ? loginWithEmail : undefined}
        />
        <Button label="로그인" disabled={!canSubmit} loading={loading === 'email'} onPress={loginWithEmail} />
        <View style={styles.linkRow}>
          <Pressable onPress={() => router.push('/auth/find')} hitSlop={6}>
            <Txt variant="caption" color={colors.muted}>
              아이디 찾기
            </Txt>
          </Pressable>
          <View style={styles.sep} />
          <Pressable onPress={() => router.push('/auth/find?tab=pw')} hitSlop={6}>
            <Txt variant="caption" color={colors.muted}>
              비밀번호 찾기
            </Txt>
          </Pressable>
          <View style={styles.sep} />
          <Pressable onPress={startEmailSignup} hitSlop={6}>
            <Txt variant="caption" weight="semibold" color={colors.inkSoft}>
              회원가입
            </Txt>
          </Pressable>
        </View>
        {__DEV__ && (
          <View style={styles.devHint}>
            <Txt variant="tiny" color={colors.infoInk}>
              개발용 테스트 계정 (비밀번호 wuzu1234!){'\n'}정상 test@wuzu.kr / 탈퇴 신청 leaving@wuzu.kr / 제재
              banned@wuzu.kr
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <Button label="로그인 전에 둘러보기" variant="outline" size="md" onPress={goHome} />
        <Txt variant="tiny" color={colors.faint} align="center">
          가입하면 이용약관과 개인정보 처리방침에 동의하게 됩니다.
        </Txt>
      </View>

      {modals}
      <AppModal
        visible={!!comingSoon}
        title={`${comingSoon} 로그인은 준비 중이에요`}
        message="지금은 카카오나 이메일로 시작해 주세요."
        onDismiss={() => setComingSoon(null)}
        actions={[{ label: '확인', onPress: () => setComingSoon(null) }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxxl, paddingBottom: spacing.sm },
  section: { gap: spacing.sm },
  socialRow: { flexDirection: 'row', gap: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.hairline },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sep: { width: 1, height: 10, backgroundColor: colors.hairline },
  devHint: { backgroundColor: colors.infoTint, borderRadius: radius.sm, padding: spacing.md },
  bottom: { gap: spacing.md, marginTop: 'auto' },
});
