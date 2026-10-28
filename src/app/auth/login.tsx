import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Wordmark } from '../../components/brand/Wordmark';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { useLoginResultHandler } from '../../features/auth/AccountStatusModals';
import { goHome } from '../../lib/nav';
import { authService, SocialProvider, usingMockAuth } from '../../services';
import { colors, radius, spacing } from '../../theme';

/** 로그인: 카카오·구글 간편 로그인만 (처음이면 그대로 가입된다) */
export default function Login() {
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [failed, setFailed] = useState(false);
  const { handle, modals } = useLoginResultHandler();

  const login = async (provider: SocialProvider) => {
    if (loading) return;
    setFailed(false);
    setLoading(provider);
    try {
      const result = await authService.socialLogin(provider);
      // 취소는 조용히 넘어가고, 실패만 안내한다
      if (!handle(result) && !result.ok && result.reason === 'failed') setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(null);
    }
  };

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
          disabled={loading === 'google'}
          icon={<Ionicons name="chatbubble" size={17} color={colors.kakaoText} />}
          onPress={() => login('kakao')}
        />
        <Button
          variant="outline"
          label="Google로 시작하기"
          loading={loading === 'google'}
          disabled={loading === 'kakao'}
          icon={<Ionicons name="logo-google" size={16} color={colors.label} />}
          onPress={() => login('google')}
        />
        {failed && (
          <Txt variant="caption" color={colors.danger} align="center">
            로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </Txt>
        )}
        {__DEV__ && usingMockAuth && (
          <View style={styles.devHint}>
            <Txt variant="tiny" color={colors.infoInk}>
              개발용 mock 로그인: 카카오 버튼 = 정상 계정
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxxl, paddingBottom: spacing.sm },
  section: { gap: spacing.sm },
  devHint: { backgroundColor: colors.infoTint, borderRadius: radius.sm, padding: spacing.md },
  bottom: { gap: spacing.md, marginTop: 'auto' },
});
