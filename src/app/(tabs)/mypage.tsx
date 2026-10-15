import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { formatDate } from '../../lib/format';
import { useSession } from '../../store/session';
import { colors, radius, shadow, spacing } from '../../theme';

const GENDER_LABEL = { male: '남성', female: '여성', none: '선택안함' } as const;
const PROVIDER_LABEL = { email: '이메일', kakao: '카카오', google: '구글', apple: '애플' } as const;

export default function MyPage() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const pushConsent = useSession((s) => s.pushConsent);
  if (!user) return <Redirect href="/auth/login" />;

  const rows: [string, string][] = [
    ['가입 방식', PROVIDER_LABEL[user.provider]],
    ['생년월일', user.birth ?? '-'],
    ['성별', user.gender ? GENDER_LABEL[user.gender] : '-'],
    ['휴대전화번호', user.phone ?? '-'],
  ];
  const settings: [string, string][] = [
    ['앱 푸시 알림', pushConsent === 'agreed' ? '받음' : '받지 않음'],
    ['마케팅 정보 수신', user.marketingAgreed ? '동의' : '미동의'],
  ];

  return (
    <Screen edges={['top']} header={<Header title="마이페이지" hideBack />} background={colors.surface}>
      <View style={styles.body}>
        <View style={[styles.profile, shadow]}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.placeholder} />
          </View>
          <View style={styles.flex}>
            <Txt variant="title">{user.name}님</Txt>
            <Txt variant="caption" color={colors.muted}>
              {user.email ?? `${PROVIDER_LABEL[user.provider]} 계정`}
            </Txt>
            <Txt variant="tiny" color={colors.faint}>
              {formatDate(user.createdAt)} 가입
            </Txt>
          </View>
        </View>

        <Section title="내 정보" rows={rows} />
        <Section title="설정" rows={settings} />

        <Button
          label="로그아웃"
          variant="outline"
          size="md"
          onPress={() => {
            logout();
            router.navigate('/home');
          }}
        />
      </View>
    </Screen>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <View style={styles.section}>
      <Txt variant="caption" weight="semibold" color={colors.muted} style={styles.sectionTitle}>
        {title}
      </Txt>
      <View style={styles.list}>
        {rows.map(([k, v], i) => (
          <View key={k} style={[styles.row, i > 0 && styles.divider]}>
            <Txt color={colors.label}>{k}</Txt>
            <Txt color={colors.ink}>{v}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: spacing.lg, gap: spacing.xl },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.canvas,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  list: {
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
});
