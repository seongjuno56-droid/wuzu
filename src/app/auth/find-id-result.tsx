import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../components/BottomCTA';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { formatDate } from '../../lib/format';
import { colors, radius, spacing } from '../../theme';

export default function FindIdResult() {
  const { maskedEmail, createdAt } = useLocalSearchParams<{ maskedEmail: string; createdAt: string }>();

  return (
    <Screen
      header={<Header title="아이디 찾기 완료" />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Pressable onPress={() => router.replace('/auth/find?tab=pw')} style={styles.link}>
            <Txt variant="caption" color={colors.textSub} align="center">
              비밀번호가 기억나지 않으시나요?
            </Txt>
            <Txt variant="caption" weight="bold" align="center">
              비밀번호 찾기
            </Txt>
          </Pressable>
          <Button label="로그인 하기" onPress={() => router.dismissTo('/auth/login')} />
        </BottomCTA>
      }
    >
      <Txt variant="title" align="center">
        회원님의 정보로 가입된{'\n'}아이디(이메일)가 존재합니다.
      </Txt>
      <View style={styles.card}>
        {createdAt && (
          <Txt variant="caption" color={colors.textSub}>
            {formatDate(createdAt)} 가입
          </Txt>
        )}
        <Txt variant="subtitle" weight="bold">
          {maskedEmail ?? '-'}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingTop: 72, gap: spacing.xxl, alignItems: 'center' },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
  },
  link: { gap: 2, paddingVertical: spacing.sm },
});
