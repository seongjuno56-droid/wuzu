import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import { isNewEntry } from '../../../features/invitation/status';
import { formatDateTime } from '../../../lib/format';
import { GuestbookEntry, invitationService } from '../../../services';
import { useSession } from '../../../store/session';
import { colors, radius, spacing } from '../../../theme';

const PAGE = 50;

/** 방명록 관리 (작성자): 신규 표시·삭제·50개씩 더보기. 나갈 때 확인 시각 저장 */
export default function GuestbookManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [entries, setEntries] = useState<GuestbookEntry[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [removing, setRemoving] = useState<GuestbookEntry | null>(null);
  // 들어올 때의 확인 시각 기준으로 '신규'를 보여준다 (보는 중에 사라지지 않게)
  const [seenAt, setSeenAt] = useState<string | undefined>(undefined);

  const load = useCallback(async () => setEntries(await invitationService.listGuestbook(id)), [id]);

  useEffect(() => {
    invitationService.get(id).then((inv) => {
      setSeenAt(inv?.guestbookSeenAt);
      load();
    });
    return () => {
      invitationService.markGuestbookSeen(id, new Date().toISOString());
    };
  }, [id, load]);

  const close = (
    <Header
      title="방명록"
      hideBack
      right={
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      }
    />
  );

  return (
    <Screen header={close} background={colors.surface} contentStyle={styles.content}>
      {entries === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Txt color={colors.muted}>작성된 방명록이 없습니다.</Txt>
        </View>
      ) : (
        <>
          {entries.slice(0, limit).map((e) => (
            <View key={e.id} style={styles.card}>
              {isNewEntry(e, seenAt) && (
                <View style={styles.newTag}>
                  <Txt variant="tiny" weight="semibold" color={colors.canvas}>
                    신규
                  </Txt>
                </View>
              )}
              <View style={styles.flex}>
                <View style={styles.row}>
                  <Txt variant="caption" weight="semibold" style={styles.flex}>
                    {e.name}
                  </Txt>
                  <Txt variant="tiny" color={colors.faint}>
                    {formatDateTime(e.createdAt)}
                  </Txt>
                </View>
                <Txt variant="caption" color={colors.label}>
                  {e.content}
                </Txt>
              </View>
              <Pressable onPress={() => setRemoving(e)} style={styles.remove} accessibilityRole="button" accessibilityLabel={`${e.name} 방명록 삭제`}>
                <Ionicons name="close" size={18} color={colors.label} />
              </Pressable>
            </View>
          ))}
          {entries.length > limit && (
            <Pressable onPress={() => setLimit((n) => n + PAGE)} style={styles.moreBtn} accessibilityRole="button">
              <Txt weight="semibold">{Math.min(PAGE, entries.length - limit)}개 더보기</Txt>
              <Ionicons name="caret-down" size={14} color={colors.label} />
            </Pressable>
          )}
        </>
      )}
      <AppModal
        visible={!!removing}
        title="삭제하시겠습니까?"
        onDismiss={() => setRemoving(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setRemoving(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!removing || !user) return;
              const r = await invitationService.removeGuestbook(id, removing.id, { ownerId: user.id });
              setRemoving(null);
              if (r === 'ok') {
                toast('삭제가 완료되었습니다.');
                load();
              } else toast('삭제하지 못했어요.');
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 80 },
  content: { padding: spacing.lg, gap: spacing.sm },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.canvas },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  newTag: { position: 'absolute', top: -6, left: -4, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.danger, borderRadius: 2, transform: [{ rotate: '-12deg' }] },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 48, backgroundColor: colors.surfaceStrong, borderRadius: radius.xs },
});
