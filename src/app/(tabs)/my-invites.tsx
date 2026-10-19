import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { Icon3D } from '../../components/brand/Icon3D';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { getTemplate } from '../../data/templates';
import { formatDate } from '../../lib/format';
import { useEditor } from '../../features/invitation/editorStore';
import { Invitation } from '../../features/invitation/model';
import { useMyInvitations } from '../../features/invitation/useMyInvitations';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, radius, shadow, spacing } from '../../theme';

type Filter = 'active' | 'draft';

function InvitationCard({ inv, onDelete }: { inv: Invitation; onDelete: () => void }) {
  const template = getTemplate(inv.themeId, inv.templateId);
  const edit = () => {
    useEditor.getState().load(inv);
    router.push('/create/editor/compose');
  };
  return (
    <View style={[styles.card, shadow]}>
      <Pressable style={styles.cardMain} onPress={() => router.push(`/invite/${inv.id}`)} accessibilityRole="button">
        {/* 작은 썸네일은 템플릿 색 견본으로 (표지 글자를 줄이면 읽히지 않는다) */}
        <View style={[styles.thumb, { backgroundColor: template?.style.bg ?? colors.surface }]}>
          <Ionicons name="heart" size={18} color={template?.style.accent ?? colors.muted} />
        </View>
        <View style={styles.flex}>
          <View style={[styles.badge, inv.status === 'final' ? styles.badgeActive : styles.badgeDraft]}>
            <Txt variant="tiny" weight="semibold" color={inv.status === 'final' ? colors.success : colors.infoInk}>
              {inv.status === 'final' ? '활성화' : '임시저장'}
            </Txt>
          </View>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {inv.name}
          </Txt>
          <Txt variant="tiny" color={colors.faint}>
            {formatDate(inv.updatedAt)} 저장 · {template?.name ?? '템플릿'}
          </Txt>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button label="보기" variant="outline" size="sm" style={styles.flex} onPress={() => router.push(`/invite/${inv.id}`)} />
        <Button label="수정" variant="outline" size="sm" style={styles.flex} onPress={edit} />
        <Button label="삭제" variant="ghost" size="sm" onPress={onDelete} />
      </View>
    </View>
  );
}

export default function MyInvites() {
  const user = useSession((s) => s.user);
  const { list, reload } = useMyInvitations();
  const [filter, setFilter] = useState<Filter>('active');
  const [deleting, setDeleting] = useState<Invitation | null>(null);
  if (!user) return <Redirect href="/auth/login" />;

  const shown = (list ?? []).filter((i) => i.status === filter);

  return (
    <Screen edges={['top']} header={<Header title="나의 초대장" hideBack divider={false} />} background={colors.surface}>
      <View style={styles.tabs}>
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: '활성화' },
            { value: 'draft', label: '임시저장' },
          ]}
        />
      </View>
      {list === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : shown.length === 0 ? (
        <View style={styles.empty}>
          <Icon3D name="loveLetter" size={96} />
          <Txt variant="title" align="center" style={styles.emptyTitle}>
            {filter === 'active' ? '활성화된 초대장이 없어요' : '임시저장한 초대장이 없어요'}
          </Txt>
          <Txt variant="caption" color={colors.muted} align="center">
            템플릿을 고르고 내용을 채우면{'\n'}링크로 바로 보낼 수 있어요.
          </Txt>
          <Button label="초대장 만들기" size="md" onPress={() => router.navigate('/create')} style={styles.cta} />
        </View>
      ) : (
        <View style={styles.list}>
          {shown.map((inv) => (
            <InvitationCard key={inv.id} inv={inv} onDelete={() => setDeleting(inv)} />
          ))}
        </View>
      )}
      <AppModal
        visible={!!deleting}
        title="초대장을 삭제하시겠습니까?"
        message="삭제하면 방명록까지 모두 사라지고 되돌릴 수 없어요."
        onDismiss={() => setDeleting(null)}
        actions={[
          { label: '닫기', variant: 'outline', onPress: () => setDeleting(null) },
          {
            label: '삭제',
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
  flex: { flex: 1 },
  tabs: { backgroundColor: colors.canvas },
  loading: { marginTop: 80 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.canvas, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardMain: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  thumb: {
    width: 56,
    height: 80,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs, marginBottom: 4 },
  badgeActive: { backgroundColor: '#E6F4EC' },
  badgeDraft: { backgroundColor: colors.infoTint },
  actions: { flexDirection: 'row', gap: spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl, minHeight: 420 },
  emptyTitle: { marginTop: spacing.lg },
  cta: { marginTop: spacing.lg, paddingHorizontal: spacing.xxl },
});
