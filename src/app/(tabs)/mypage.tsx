import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { useSession } from '../../store/session';
import { colors, radius, spacing } from '../../theme';

const GENDER_LABEL = { male: '남성', female: '여성', none: '선택안함' } as const;
const PROVIDER_LABEL = { email: '이메일', kakao: '카카오', google: '구글', apple: '애플' } as const;

export default function MyPage() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  if (!user) return <Redirect href="/auth/login" />;

  const rows: [string, string][] = [
    ['가입 방식', PROVIDER_LABEL[user.provider]],
    ['이메일', user.email ?? '-'],
    ['생년월일', user.birth ?? '-'],
    ['성별', user.gender ? GENDER_LABEL[user.gender] : '-'],
    ['마케팅 수신', user.marketingAgreed ? '동의' : '미동의'],
  ];

  return (
    <Screen edges={['top']} header={<Header title="마이페이지" hideBack />}>
      <View style={styles.body}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Txt variant="title" color={colors.textOnPrimary}>
              {user.name.slice(0, 1)}
            </Txt>
          </View>
          <Txt variant="subtitle" weight="bold">
            {user.name}님
          </Txt>
        </View>
        <View style={styles.card}>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Txt color={colors.textSub}>{k}</Txt>
              <Txt weight="medium">{v}</Txt>
            </View>
          ))}
        </View>
        <Button
          label="로그아웃"
          variant="outline"
          onPress={() => {
            logout();
            router.navigate('/home');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.xl, gap: spacing.xl },
  profile: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
