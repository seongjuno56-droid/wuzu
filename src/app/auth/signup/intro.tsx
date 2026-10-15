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
import { colors, radius, shadow, spacing } from '../../../theme';

const FEATURES: { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'time-outline', title: '10분이면 완성', body: '휴대폰으로 직접 만들고, 링크로 바로 보내요.' },
  { icon: 'color-palette-outline', title: '템플릿·컬러·폰트 자유롭게', body: '수정 횟수 제한 없이 몇 번이고 고칠 수 있어요.' },
  { icon: 'albums-outline', title: '청첩장부터 기업 행사까지', body: '돌잔치, 모임, 송년회 초대장도 준비되어 있어요.' },
];

export default function SignupIntro() {
  useSignupGuard();
  return (
    <Screen
      header={<Header title="회원가입" />}
      background={colors.surface}
      footer={
        <BottomCTA>
          <Button label="이메일로 가입 시작하기" onPress={() => router.push('/auth/signup/terms')} />
        </BottomCTA>
      }
      contentStyle={styles.content}
    >
      <View style={styles.head}>
        <Txt variant="headline">반가워요!{'\n'}wuzu에서 초대장을 만들어 보세요</Txt>
        <Txt variant="caption" color={colors.muted}>
          가입은 1분이면 끝나요.
        </Txt>
      </View>
      <View style={[styles.list, shadow]}>
        {FEATURES.map((f, i) => (
          <View key={f.title} style={[styles.item, i > 0 && styles.divider]}>
            <View style={styles.icon}>
              <Ionicons name={f.icon} size={22} color={colors.inkSoft} />
            </View>
            <View style={styles.flex}>
              <Txt variant="bodyStrong">{f.title}</Txt>
              <Txt variant="caption" color={colors.muted}>
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
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  head: { paddingHorizontal: spacing.xs, paddingTop: spacing.lg, gap: spacing.xs },
  list: { backgroundColor: colors.canvas, borderRadius: radius.xl, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
