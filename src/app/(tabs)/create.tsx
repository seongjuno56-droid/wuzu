import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { THEMES } from '../../data/themes';
import { useSession } from '../../store/session';
import { colors, radius, spacing } from '../../theme';

export default function CreateThemeSelect() {
  const name = useSession((s) => s.user?.name);

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Txt variant="title" align="center">
          안녕하세요{name ? `, ${name}님` : '!'}
          {'\n'}어떤 초대장이 필요한가요?
        </Txt>
      </View>
      <View style={styles.grid}>
        {THEMES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.push(`/create/${t.id}`)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.tintSoft, borderColor: pressed ? t.tint : 'transparent' },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: t.tint }]}>
              <Ionicons name={t.icon} size={30} color="#fff" />
            </View>
            <Txt variant="subtitle" weight="bold">
              {t.label}
            </Txt>
            <Txt variant="caption" color={colors.textSub} align="center">
              {t.description}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.xxxl, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  card: {
    width: '47.5%',
    flexGrow: 1,
    aspectRatio: 0.8,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
