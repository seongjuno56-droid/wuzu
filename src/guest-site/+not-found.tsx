import { StyleSheet } from 'react-native';

import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { colors, spacing } from '../theme';

/** 공개 웹의 없는 주소. 앱 화면으로 나가는 버튼을 두지 않는다 */
export default function GuestSiteNotFound() {
  return (
    <Screen contentStyle={styles.body}>
      <Txt variant="title" align="center">
        페이지를 찾을 수 없어요
      </Txt>
      <Txt variant="caption" color={colors.muted} align="center">
        삭제되었거나 주소가 잘못되었어요.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
});
