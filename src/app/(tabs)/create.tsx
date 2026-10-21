import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { ThemeRow } from '../../components/ThemeTile';
import { Txt } from '../../components/Txt';
import { THEMES } from '../../data/themes';
import { useLocale } from '../../i18n';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

export default function CreateThemeSelect() {
  const name = useSession((s) => s.user?.name);
  const locale = useLocale((s) => s.locale);
  // 이름 부르기는 언어마다 꼴이 달라 따로 만든다 (이름은 번역하지 않음)
  const call = name ? (locale === 'en' ? `${name}, ` : /* i18n-ignore */ `${name}님, `) : '';

  return (
    <Screen edges={['top']} header={<Header title="초대장 만들기" hideBack />} background={colors.surface}>
      <View style={styles.head}>
        <Txt variant="headline">{call}어떤 초대장이 필요한가요?</Txt>
        <Txt variant="caption" color={colors.muted}>
          테마를 고르면 어울리는 템플릿을 보여드려요.
        </Txt>
      </View>
      <View style={styles.list}>
        {THEMES.map((t) => (
          <ThemeRow key={t.id} theme={t} onPress={() => router.push(`/create/${t.id}`)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
});
