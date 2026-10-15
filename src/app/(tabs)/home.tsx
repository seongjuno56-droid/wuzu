import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { BannerCarousel } from '../../components/home/BannerCarousel';
import { HomeFooter } from '../../components/home/HomeFooter';
import { PushConsentModal } from '../../components/home/PushConsentModal';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { NOTICES } from '../../data/home';
import { THEMES } from '../../data/themes';
import { useSession } from '../../store/session';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

export default function Home() {
  const user = useSession((s) => s.user);
  const pushConsent = useSession((s) => s.pushConsent);
  const setPushConsent = useSession((s) => s.setPushConsent);
  const [info, setInfo] = useState<string | null>(null);

  return (
    <Screen edges={['top']} background={colors.surface}>
      <View style={styles.topBar}>
        <Txt style={styles.logo} color={colors.primary}>
          wuzu
        </Txt>
        <Pressable hitSlop={10} onPress={() => setInfo('알림 기능은 준비 중이에요.')} accessibilityLabel="알림">
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {user ? (
          <Pressable style={[styles.card, shadow]} onPress={() => router.push('/my-invites')}>
            <View style={styles.cardHead}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Txt variant="bodyStrong" weight="bold" style={styles.flex}>
                {user.name}님의 초대장 현황
              </Txt>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.statRow}>
              <Txt color={colors.textSub}>현재 활성화 중인 초대장</Txt>
              <Txt variant="subtitle" weight="bold" color={colors.primary}>
                0장
              </Txt>
            </View>
            <View style={styles.statRow}>
              <Txt variant="caption" color={colors.textSub}>
                최근 제작
              </Txt>
              <Txt variant="caption" color={colors.textMuted} numberOfLines={1} style={styles.recent}>
                아직 만든 초대장이 없어요
              </Txt>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.card, shadow]}>
            <View style={styles.cardHead}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Txt variant="bodyStrong" weight="bold">
                WUZU에 온 것을 환영해요!
              </Txt>
            </View>
            <Txt color={colors.textSub}>초대장을 만들기 위해 먼저 로그인 해주세요.</Txt>
            <Button label="로그인 >" size="md" onPress={() => router.push('/auth/login')} />
          </View>
        )}

        <Txt variant="subtitle" weight="bold" style={styles.sectionTitle}>
          WUZU가 추천하는 초대장
        </Txt>
        <View style={styles.grid}>
          {THEMES.map((t) => (
            <Pressable
              key={t.id}
              style={({ pressed }) => [styles.themeCard, { backgroundColor: t.tintSoft }, pressed && styles.pressed]}
              onPress={() => router.push(`/create/${t.id}`)}
            >
              <View style={[styles.themeIcon, { backgroundColor: t.tint }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <View style={styles.themeText}>
                <Txt variant="bodyStrong" weight="bold">
                  {t.title}
                </Txt>
                <Txt variant="tiny" color={colors.textSub} numberOfLines={1}>
                  {t.tags.join(' ')}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>

        <BannerCarousel />

        <View style={[styles.noticeBox]}>
          <Pressable style={styles.noticeHead} onPress={() => setInfo('공지사항 목록은 준비 중이에요.')}>
            <Txt variant="bodyStrong" weight="bold" style={styles.flex}>
              우쥬 공지사항
            </Txt>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          {NOTICES.map((n) => (
            <View key={n.id} style={styles.noticeRow}>
              <Txt variant="caption" style={styles.flex} numberOfLines={1}>
                {n.title}
              </Txt>
              <Txt variant="tiny" color={colors.textMuted}>
                {n.date}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <HomeFooter onLinkPress={(label) => setInfo(`${label} 페이지는 준비 중이에요.`)} />

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
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  logo: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.8 },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  recent: { flex: 1, textAlign: 'right' },
  sectionTitle: { marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  themeCard: {
    width: '47.5%',
    flexGrow: 1,
    aspectRatio: 1.15,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.85 },
  themeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  themeText: { gap: 2 },
  noticeBox: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  noticeHead: { flexDirection: 'row', alignItems: 'center' },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
