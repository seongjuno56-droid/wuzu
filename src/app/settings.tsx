import { StyleSheet, Switch, View } from 'react-native';

import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

/** 앱 설정: PUSH 알림 (꺼도 마케팅 수신 동의는 그대로) */
export default function SettingsScreen() {
  const push = useSession((s) => s.pushConsent);
  const setPush = useSession((s) => s.setPushConsent);
  return (
    <Screen header={<Header title="앱 설정" />}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt variant="subtitle">PUSH 알림</Txt>
          <Txt variant="caption" color={colors.muted}>
            공지사항, 이벤트, 구매 알림
          </Txt>
        </View>
        <Switch
          value={push === 'agreed'}
          onValueChange={(v) => setPush(v ? 'agreed' : 'declined')}
          trackColor={{ false: colors.hairline, true: colors.brand }}
          thumbColor={colors.canvas}
          // 웹은 켜진 상태 손잡이 색을 따로 지정해야 한다
          {...({ activeThumbColor: colors.canvas } as object)}
          accessibilityLabel="PUSH 알림"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.hairline },
});
