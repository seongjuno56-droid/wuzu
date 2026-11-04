import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Header } from '../../../components/Header';
import { LoadFailed } from '../../../components/LoadFailed';
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

  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);

  // 처음 들어올 때: 확인 시각과 목록을 함께 읽는다. 하나라도 실패하면 모든 글이 신규로 보이지 않게 [다시 시도] 로
  const open = useCallback(
    () =>
      invitationService
        .get(id)
        .then(async (inv) => {
          const list = await invitationService.listGuestbook(id);
          setSeenAt(inv?.guestbookSeenAt);
          setEntries(list);
          loaded.current = true;
        })
        .catch(() => setFailed(true)),
    [id],
  );

  // 삭제 뒤 새로고침: 실패하면 보이던 목록을 그대로 둔다
  const load = useCallback(async () => {
    try {
      setEntries(await invitationService.listGuestbook(id));
    } catch {
      toast('방명록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [id]);

  useEffect(() => {
    open();
    return () => {
      // 보지 못한 글을 확인한 것으로 만들지 않는다. 다음에 신규 표시가 남을 뿐이라 실패해도 안내하지 않는다
      if (loaded.current) invitationService.markGuestbookSeen(id, new Date().toISOString()).catch(() => {});
    };
  }, [id, open]);

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
      {entries === null && failed ? (
        <LoadFailed
          message="방명록을 불러오지 못했어요."
          onRetry={() => {
            setFailed(false);
            open();
          }}
        />
      ) : entries === null ? (
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
              const r = await invitationService.removeGuestbook(id, removing.id, { ownerId: user.id }).catch(() => 'failed' as const);
              setRemoving(null);
              if (r === 'ok') {
                toast('삭제가 완료되었습니다.');
                load();
              } else if (r === 'not_found') {
                toast('이미 삭제된 글이에요.');
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
