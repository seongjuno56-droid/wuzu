import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { Txt } from '../components/Txt';
import { NotificationTab, visibleNotifications } from '../features/notifications/model';
import { formatDate } from '../lib/format';
import { AppNotification, notificationService } from '../services';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

/** WUZU 알림 풀 모달: 전체/공지/구매, 15일 보관. 열면 모두 읽음 */
export default function NotificationsScreen() {
  const user = useSession((s) => s.user);
  const [tab, setTab] = useState<NotificationTab>('all');
  const [loaded, setLoaded] = useState<{ items: AppNotification[]; at: Date } | null>(null);

  useEffect(() => {
    if (!user) return;
    notificationService.list(user.id).then((items) => setLoaded({ items, at: new Date() }));
    notificationService.markAllRead(user.id, new Date().toISOString());
  }, [user]);

  const shown = loaded ? visibleNotifications(loaded.items, tab, loaded.at) : null;
  const go = (link: string) => {
    router.back();
    router.push(link);
  };

  return (
    <Screen
      header={
        <Header
          title="WUZU 알림"
          hideBack
          right={
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="닫기">
              <Ionicons name="close" size={24} color={colors.inkSoft} />
            </Pressable>
          }
        />
      }
    >
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: '전체' },
          { value: 'notice', label: '공지' },
          { value: 'purchase', label: '구매' },
        ]}
      />
      <Txt variant="caption" color={colors.label} align="center" style={styles.info}>
        알림은 수신일로부터 15일 동안 보관됩니다.{'\n'}수신 거부 : 마이페이지 {'>'} 앱 설정
      </Txt>
      {shown === null ? (
        <ActivityIndicator color={colors.inkSoft} />
      ) : shown.length === 0 ? (
        <Txt color={colors.muted} align="center" style={styles.empty}>
          받은 알림이 없습니다.
        </Txt>
      ) : (
        shown.map((n) => (
          <View key={n.id} style={styles.item}>
            <View style={styles.icon}>
              {n.category === 'notice' ? (
                <Ionicons name="notifications-outline" size={26} color={colors.canvas} />
              ) : n.category === 'rsvp' ? (
                <Ionicons name="people-outline" size={26} color={colors.canvas} />
              ) : (
                <Txt variant="title" color={colors.canvas}>
                  ₩
                </Txt>
              )}
            </View>
            <View style={styles.flex}>
              <View style={styles.row}>
                <Txt variant="tiny" color={colors.muted} style={styles.flex}>
                  {formatDate(n.createdAt)}
                </Txt>
                <Pressable onPress={() => go(n.link)} hitSlop={8} accessibilityRole="link">
                  <Txt variant="tiny" color={colors.label} style={styles.underline}>
                    바로가기 {'>'}
                  </Txt>
                </Pressable>
              </View>
              <Txt variant="caption">{n.title}</Txt>
              {!!n.body && (
                <Txt variant="caption" color={colors.label}>
                  {n.body}
                </Txt>
              )}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  info: { padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  empty: { paddingVertical: 80 },
  item: { flexDirection: 'row', gap: spacing.lg, padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  underline: { textDecorationLine: 'underline' },
});
