import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { LetterBadge } from '../../components/LetterBadge';
import { Screen } from '../../components/Screen';
import { SelectSheet } from '../../components/SelectSheet';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { useEditor } from '../../features/invitation/editorStore';
import { Invitation } from '../../features/invitation/model';
import {
  filterInvitations,
  hasNewGuestbook,
  InviteFilter,
  ScreenStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  yearOptions,
} from '../../features/invitation/status';
import { useMyInvitations } from '../../features/invitation/useMyInvitations';
import { CardAction, InviteCard } from '../../features/my-invites/InviteCard';
import { MoreAction, MoreSheet } from '../../features/my-invites/MoreSheet';
import { RenameModal } from '../../features/my-invites/RenameModal';
import { shareInvitation } from '../../features/my-invites/share';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, radius, spacing } from '../../theme';

function FilterButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filter} accessibilityRole="button">
      <Txt variant="caption" color={colors.label}>
        {label}
      </Txt>
      <Ionicons name="caret-down" size={12} color={colors.label} />
    </Pressable>
  );
}

export default function MyInvites() {
  const user = useSession((s) => s.user);
  const { list, reload } = useMyInvitations();
  const [filter, setFilter] = useState<InviteFilter>({ year: 'all', status: 'all' });
  const [sheet, setSheet] = useState<'year' | 'status' | null>(null);
  const [more, setMore] = useState<Invitation | null>(null);
  const [renaming, setRenaming] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState<Invitation | null>(null);
  const [newBook, setNewBook] = useState<Record<string, boolean>>({});
  // 목록을 다시 불러올 때마다 현재 시각을 새로 잡는다 (의도한 의존성)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [list]);

  // 방명록 (New) 표시: 방명록을 켠 초대장만 확인
  useEffect(() => {
    if (!list) return;
    let alive = true;
    Promise.all(
      list
        .filter((i) => i.enabled.guestbook)
        .map(async (i) => [i.id, hasNewGuestbook(await invitationService.listGuestbook(i.id), i.guestbookSeenAt)] as const),
    ).then((pairs) => alive && setNewBook(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [list]);

  if (!user) return <Redirect href="/auth/login" />;

  const all = list ?? [];
  const shown = filterInvitations(all, filter, now);
  const years = yearOptions(all);

  const edit = (inv: Invitation) => {
    useEditor.getState().load(inv);
    router.push('/create/editor/compose');
  };

  const onCard = (inv: Invitation, a: CardAction) => {
    switch (a) {
      case 'complete':
        return edit(inv);
      case 'activate':
        return router.push(`/invitation/${inv.id}/activate`);
      case 'extend':
        return router.push(`/invitation/${inv.id}/extend`);
      case 'share':
        return shareInvitation(inv);
      case 'guestbook':
        return router.push(`/invitation/${inv.id}/guestbook`);
      case 'preview':
        return router.push(`/invite/${inv.id}`);
      case 'more':
        return setMore(inv);
      case 'delete':
        return setDeleting(inv);
    }
  };

  const onMore = (a: MoreAction) => {
    const inv = more!;
    setMore(null);
    if (a === 'history') router.push(`/invitation/${inv.id}/history`);
    if (a === 'rename') setRenaming(inv);
    if (a === 'edit') edit(inv);
    if (a === 'delete') setDeleting(inv);
  };

  const filtered = filter.year !== 'all' || filter.status !== 'all';

  return (
    <Screen
      edges={['top']}
      header={<Header title="나의 초대장" hideBack right={<LetterBadge />} />}
      background={colors.surface}
    >
      <View style={styles.filters}>
        <FilterButton label={filter.year === 'all' ? '제작 연도' : `${filter.year}년`} onPress={() => setSheet('year')} />
        <FilterButton label={filter.status === 'all' ? '상태' : STATUS_LABEL[filter.status]} onPress={() => setSheet('status')} />
      </View>

      {list === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : shown.length === 0 ? (
        <View style={styles.empty}>
          <Txt variant="subtitle" align="center">
            {all.length === 0 ? '제작된 초대장이 없습니다.' : '조건에 맞는 초대장이 없습니다.'}
          </Txt>
          {all.length === 0 ? (
            <Button label="초대장 제작하러 가기" variant="outline" size="md" onPress={() => router.navigate('/create')} style={styles.cta} />
          ) : (
            filtered && (
              <Button label="필터 초기화" variant="outline" size="md" onPress={() => setFilter({ year: 'all', status: 'all' })} style={styles.cta} />
            )
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {shown.map((inv) => (
            <InviteCard key={inv.id} invitation={inv} now={now} hasNew={!!newBook[inv.id]} onAction={(a) => onCard(inv, a)} />
          ))}
        </View>
      )}

      <SelectSheet<number | 'all'>
        visible={sheet === 'year'}
        title="제작 연도"
        options={[{ value: 'all', label: '전체' }, ...years.map((y) => ({ value: y, label: `${y}년` }))]}
        value={filter.year}
        onClose={() => setSheet(null)}
        onSelect={(year) => {
          setFilter((f) => ({ ...f, year }));
          setSheet(null);
        }}
      />
      <SelectSheet<ScreenStatus | 'all'>
        visible={sheet === 'status'}
        title="상태"
        options={[{ value: 'all', label: '전체' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        value={filter.status}
        onClose={() => setSheet(null)}
        onSelect={(status) => {
          setFilter((f) => ({ ...f, status }));
          setSheet(null);
        }}
      />
      <MoreSheet invitation={more} visible={!!more} onSelect={onMore} onClose={() => setMore(null)} />
      <RenameModal
        invitation={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={() => {
          setRenaming(null);
          reload();
        }}
      />
      <AppModal
        visible={!!deleting}
        title="삭제하시겠습니까?"
        message="삭제 시 복구할 수 없습니다."
        onDismiss={() => setDeleting(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setDeleting(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!deleting) return;
              await invitationService.remove(deleting.id);
              setDeleting(null);
              toast('삭제가 완료되었습니다.');
              reload();
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.canvas },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xs,
    backgroundColor: colors.canvas,
  },
  loading: { marginTop: 80 },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl, minHeight: 420 },
  cta: { paddingHorizontal: spacing.xxl },
});
