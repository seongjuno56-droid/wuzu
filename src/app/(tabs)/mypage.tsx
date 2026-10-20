import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HomeFooter } from '../../components/home/HomeFooter';
import { Header } from '../../components/Header';
import { MenuGap, MenuRow } from '../../components/MenuRow';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { useWallet } from '../../features/wallet/useWallet';
import { notificationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

const LINK_ROUTES: Record<string, string> = {
  이용약관: '/about/terms',
  '유료 이용약관': '/about/terms',
  '개인정보 처리방침': '/about/privacy',
};

/** 마이페이지: 인사·보유 레터 / 회원정보·My 레터·앱 설정·WUZU 정보 / 로그아웃 / 사업자 정보 */
export default function MyPage() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (user) notificationService.unreadCount(user.id).then(setUnread);
    }, [refresh, user]),
  );

  if (!user) return <Redirect href="/auth/login" />;

  const signOut = () => {
    logout();
    router.navigate('/home');
  };

  const bell = (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={unread ? `알림, 새 알림 ${unread}개` : '알림'}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.inkSoft} />
      {unread > 0 && <View style={styles.dot} />}
    </Pressable>
  );

  return (
    <Screen edges={['top']} header={<Header title="마이페이지" hideBack right={bell} />} background={colors.surface}>
      <Pressable style={styles.top} onPress={() => router.push('/wallet')} accessibilityRole="button">
        <Txt variant="subtitle">
          <Txt variant="subtitle" weight="semibold">
            {user.name}
          </Txt>
          님 반가워요.
        </Txt>
        <View style={styles.balance}>
          <Txt variant="subtitle" style={styles.flex}>
            보유중인 레터
          </Txt>
          <Txt variant="title">{balance ?? '–'} 레터</Txt>
        </View>
      </Pressable>
      <MenuGap />
      <MenuRow label="회원정보" onPress={() => router.push('/account')} />
      <MenuRow label="My 레터" onPress={() => router.push('/wallet')} />
      <MenuRow label="앱 설정" onPress={() => router.push('/settings')} />
      <MenuRow label="WUZU 정보" onPress={() => router.push('/about')} />
      <MenuGap />
      <MenuRow label="로그아웃" muted onPress={signOut} />
      <View style={styles.footer}>
        <HomeFooter
          loggedIn
          onAuthPress={signOut}
          onLinkPress={(label) => (LINK_ROUTES[label] ? router.push(LINK_ROUTES[label]) : toast('복원할 구매 내역이 없어요.'))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { backgroundColor: colors.canvas, padding: spacing.xl, gap: spacing.sm },
  balance: { flexDirection: 'row', alignItems: 'center' },
  dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  footer: { marginTop: 'auto', paddingTop: spacing.xxl },
});
