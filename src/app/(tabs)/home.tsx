import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Icon3D } from '../../components/brand/Icon3D';
import { Wordmark } from '../../components/brand/Wordmark';
import { Button } from '../../components/Button';
import { BannerCarousel } from '../../components/home/BannerCarousel';
import { HomeFooter } from '../../components/home/HomeFooter';
import { PushConsentModal } from '../../components/home/PushConsentModal';
import { Screen } from '../../components/Screen';
import { ThemeTile } from '../../components/ThemeTile';
import { Txt } from '../../components/Txt';
import { NOTICES } from '../../data/home';
import { THEMES } from '../../data/themes';
import { useSession } from '../../store/session';
import { colors, radius, shadow, spacing } from '../../theme';

const STATS = [
  { label: '진행 중', value: 0 },
  { label: '받은 응답', value: 0 },
  { label: '총 조회수', value: 0 },
];

export default function Home() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const pushConsent = useSession((s) => s.pushConsent);
  const setPushConsent = useSession((s) => s.setPushConsent);
  const [info, setInfo] = useState<string | null>(null);

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Wordmark size={26} />
        <Pressable
          hitSlop={10}
          style={styles.iconButton}
          onPress={() => setInfo('알림 기능은 준비 중이에요.')}
          accessibilityRole="button"
          accessibilityLabel="알림"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.inkSoft} />
        </Pressable>
      </View>
      <Pressable
        style={styles.search}
        onPress={() => router.navigate('/create')}
        accessibilityRole="search"
        accessibilityLabel="초대장 템플릿 찾기"
      >
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <Txt variant="caption" color={colors.placeholder}>
          청첩장, 돌잔치, 모임 템플릿 찾기
        </Txt>
      </Pressable>
    </View>
  );

  return (
    <Screen edges={['top']} header={header} background={colors.surface}>
      <View style={styles.column}>
        <BannerCarousel />

        {/* 내 초대장 요약 — 데이터 먼저 */}
        <View style={[styles.card, shadow]}>
          {user ? (
            <>
              <Pressable style={styles.cardHead} onPress={() => router.navigate('/my-invites')}>
                <Txt variant="title" style={styles.flex}>
                  {user.name}님의 초대장
                </Txt>
                <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
              </Pressable>
              <View style={styles.stats}>
                {STATS.map((s, i) => (
                  <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
                    <Txt variant="headline">{s.value}</Txt>
                    <Txt variant="tiny" color={colors.muted}>
                      {s.label}
                    </Txt>
                  </View>
                ))}
              </View>
              <Button label="새 초대장 만들기" onPress={() => router.navigate('/create')} />
            </>
          ) : (
            <>
              <View style={styles.guestRow}>
                <View style={styles.flex}>
                  <Txt variant="title">로그인하고{'\n'}첫 초대장을 만들어 보세요</Txt>
                  <Txt variant="caption" color={colors.muted} style={styles.guestSub}>
                    조회수와 응답을 한눈에 확인해요.
                  </Txt>
                </View>
                <Icon3D name="loveLetter" size={72} />
              </View>
              <Button label="로그인하고 시작하기" onPress={() => router.push('/auth/login')} style={styles.cardButton} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="title">어떤 초대장을 만들까요?</Txt>
            <Pressable onPress={() => router.navigate('/create')} hitSlop={8}>
              <Txt variant="caption" color={colors.muted}>
                전체보기
              </Txt>
            </Pressable>
          </View>
          <View style={styles.tiles}>
            {THEMES.map((t) => (
              <ThemeTile key={t.id} theme={t} onPress={() => router.push(`/create/${t.id}`)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="title">공지사항</Txt>
            <Pressable onPress={() => setInfo('공지사항 목록은 준비 중이에요.')} hitSlop={8}>
              <Txt variant="caption" color={colors.muted}>
                전체보기
              </Txt>
            </Pressable>
          </View>
          <View style={[styles.list, shadow]}>
            {NOTICES.map((n, i) => (
              <Pressable
                key={n.id}
                style={({ pressed }) => [styles.listRow, i > 0 && styles.listDivider, pressed && styles.pressed]}
                onPress={() => setInfo('공지사항 상세는 준비 중이에요.')}
              >
                <Txt style={styles.flex} numberOfLines={1}>
                  {n.title}
                </Txt>
                <Txt variant="tiny" color={colors.faint}>
                  {n.date}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <HomeFooter
        loggedIn={!!user}
        onAuthPress={() => (user ? logout() : router.push('/auth/login'))}
        onLinkPress={(label) => setInfo(`${label} 페이지는 준비 중이에요.`)}
      />

      <PushConsentModal
        visible={pushConsent === null}
        onAgree={() => setPushConsent('agreed')}
        onDecline={() => setPushConsent('declined')}
      />
      <AppModal visible={!!info} message={info ?? ''} actions={[{ label: '확인', onPress: () => setInfo(null) }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { padding: 10, marginRight: -10 },
  search: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  column: { padding: spacing.lg, gap: spacing.xxl },
  card: { backgroundColor: colors.canvas, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  cardButton: { marginTop: spacing.xs },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guestSub: { marginTop: spacing.xs },
  stats: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.hairline },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  list: { backgroundColor: colors.canvas, borderRadius: radius.sm, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  listDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.surface },
});
