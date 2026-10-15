import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { useSignupGuard } from '../../../features/auth/useSignupGuard';
import { colors, radius, spacing } from '../../../theme';

const FEATURES: { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'time-outline', title: '10분이면 나만의 초대장 완성!', body: '모바일 앱으로 직접 만드는 특별한 초대장.\n시간과 비용 모두 합리적인 wuzu.' },
  { icon: 'color-palette-outline', title: '템플릿, 컬러, 폰트 모두 내맘대로', body: '손으로 쓰는 것처럼 편하고 자유롭게!\n수정횟수 제한없이 편하게 사용하세요.' },
  { icon: 'sparkles-outline', title: '세상에는 초대할 일이 정말 많아요!', body: '청첩장, 돌잔치 뿐만 아니라 다양한 유형의\n이색 초대장들도 가득하답니다.' },
];

export default function SignupIntro() {
  useSignupGuard();
  return (
    <Screen
      header={<Header title="wuzu 회원가입" />}
      background={colors.surface}
      footer={
        <BottomCTA>
          <Button label="wuzu, 지금 바로 시작할래요" onPress={() => router.push('/auth/signup/terms')} />
        </BottomCTA>
      }
      contentStyle={styles.content}
    >
      <Txt variant="title" align="center">
        반가워요!{'\n'}wuzu와 함께 한다는 건,{'\n'}
        <Txt variant="title" color={colors.primary}>
          당신에게 기쁜 소식
        </Txt>
        이 생긴 거겠죠?
      </Txt>
      <View style={styles.list}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.item}>
            <View style={styles.iconTile}>
              <Ionicons name={f.icon} size={30} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyStrong" weight="bold">
                {f.title}
              </Txt>
              <Txt variant="caption" color={colors.textSub}>
                {f.body}
              </Txt>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  content: { padding: spacing.xl, gap: spacing.xxl, paddingTop: spacing.xxxl },
  list: { gap: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
