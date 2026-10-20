import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { nextPushOnMarketing } from '../../features/account/consent';
import { displayLoginId } from '../../features/account/rules';
import { formatDate } from '../../lib/format';
import { authService } from '../../services';
import { useSession } from '../../store/session';
import { colors, radius, spacing } from '../../theme';

const GENDER = { male: '남성', female: '여성', none: '-' } as const;

/** 회원정보: 아이디·닉네임·성별·생년월일 / 최종 수정일 / 마케팅 수신 동의 */
export default function AccountScreen() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const setPush = useSession((s) => s.setPushConsent);
  const push = useSession((s) => s.pushConsent);
  const [saving, setSaving] = useState(false);
  if (!user) return <Redirect href="/auth/login" />;

  const rows: [string, string][] = [
    ['아이디', displayLoginId(user)],
    ['닉네임', user.name],
    ['성별', user.gender ? GENDER[user.gender] : '-'],
    ['생년월일', user.birth ?? '-'],
  ];

  const toggleMarketing = async (agreed: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      setUser(await authService.setMarketing(user.id, agreed));
      setPush(nextPushOnMarketing(agreed, push));
    } catch {
      toast('변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<Header title="회원정보" />} contentStyle={styles.content}>
      <View style={styles.card}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.item}>
            <Txt weight="semibold">{k}</Txt>
            <Txt color={colors.muted}>{v}</Txt>
          </View>
        ))}
      </View>
      <View style={styles.line}>
        <View style={styles.flex}>
          <Txt variant="subtitle">회원정보</Txt>
          <Txt variant="caption" color={colors.muted}>
            최종 수정일 : {formatDate(user.profileUpdatedAt ?? user.createdAt, '-')}
          </Txt>
        </View>
        <Pressable onPress={() => router.push('/account/edit')} hitSlop={8} accessibilityRole="button">
          <Txt variant="caption" color={colors.label} style={styles.underline}>
            수정하기
          </Txt>
        </Pressable>
      </View>
      <View style={styles.line}>
        <View style={styles.flex}>
          <Txt variant="subtitle">마케팅 정보 수신 동의</Txt>
          <Txt variant="caption" color={colors.muted}>
            최종 수정일 : {formatDate(user.marketingUpdatedAt ?? user.createdAt, '-')}
          </Txt>
        </View>
        <Switch
          value={user.marketingAgreed}
          onValueChange={toggleMarketing}
          disabled={saving}
          trackColor={{ false: colors.hairline, true: colors.inkSoft }}
          thumbColor={colors.canvas}
          // 웹은 켜진 상태 손잡이 색을 따로 지정해야 한다
          {...({ activeThumbColor: colors.canvas } as object)}
          accessibilityLabel="마케팅 정보 수신 동의"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  item: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  underline: { textDecorationLine: 'underline' },
});
