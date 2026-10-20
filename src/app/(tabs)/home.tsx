import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Wordmark } from '../../components/brand/Wordmark';
import { BannerCarousel } from '../../components/home/BannerCarousel';
import { HomeFooter } from '../../components/home/HomeFooter';
import { InvitationStatusCard } from '../../components/home/InvitationStatusCard';
import { OnboardingModal } from '../../components/home/OnboardingModal';
import { PushConsentModal } from '../../components/home/PushConsentModal';
import { RecommendedCards } from '../../components/home/RecommendedCards';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { noticeList } from '../../data/notices';
import { useMyInvitations } from '../../features/invitation/useMyInvitations';
import { formatDate } from '../../lib/format';
import { useSession } from '../../store/session';
import { colors, radius, shadow, spacing } from '../../theme';

export default function Home() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const pushConsent = useSession((s) => s.pushConsent);
  const setPushConsent = useSession((s) => s.setPushConsent);
  const needsOnboarding = useSession((s) => s.needsOnboarding);
  const [info, setInfo] = useState<string | null>(null);
  const { list: invitations } = useMyInvitations();
  // 공지사항·알림: 비회원은 로그인 먼저, 회원은 WUZU 정보 공지사항·알림 모달 (마이페이지와 같은 데이터)
  const needLogin = (go: () => void) => (user ? go() : router.push('/auth/login'));
  const openNotices = () => needLogin(() => router.push('/about/notices'));
  const notices = noticeList().slice(0, 3);

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Wordmark size={26} />
        <Pressable
          hitSlop={10}
          style={styles.iconButton}
          onPress={() => needLogin(() => router.push('/notifications'))}
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

        <InvitationStatusCard user={user} invitations={invitations} />

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="title">WUZU가 추천하는 초대장</Txt>
            <Pressable onPress={() => router.navigate('/create')} hitSlop={8}>
              <Txt variant="caption" color={colors.muted}>
                전체보기
              </Txt>
            </Pressable>
          </View>
          <RecommendedCards />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="title">공지사항</Txt>
            <Pressable onPress={openNotices} hitSlop={8}>
              <Txt variant="caption" color={colors.muted}>
                전체보기
              </Txt>
            </Pressable>
          </View>
          <View style={[styles.list, shadow]}>
            {notices.map((n, i) => (
              <Pressable
                key={n.id}
                style={({ pressed }) => [styles.listRow, i > 0 && styles.listDivider, pressed && styles.pressed]}
                onPress={() => needLogin(() => router.push(`/about/notices/${n.id}`))}
              >
                <Txt style={styles.flex} numberOfLines={1}>
                  {n.title}
                </Txt>
                <Txt variant="tiny" color={colors.faint}>
                  {formatDate(n.date)}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <HomeFooter
        loggedIn={!!user}
        onAuthPress={() => (user ? logout() : router.push('/auth/login'))}
        onLinkPress={(label) =>
          label === '구매 복원'
            ? setInfo('복원할 구매 내역이 없어요.')
            : router.push(label === '개인정보 처리방침' ? '/about/privacy' : '/about/terms')
        }
      />

      <PushConsentModal
        visible={pushConsent === null}
        onAgree={() => setPushConsent('agreed')}
        onDecline={() => setPushConsent('declined')}
      />
      {/* 푸시 동의를 먼저 받고, 그 다음 간편 가입 회원정보 기입 */}
      <OnboardingModal visible={!!user && needsOnboarding && pushConsent !== null} />
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
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { backgroundColor: colors.canvas, borderRadius: radius.sm, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  listDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.surface },
});
