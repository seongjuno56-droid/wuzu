import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import type { Invitation } from '../../../features/invitation/model';
import { emptyRsvpInput, RsvpResponse, rsvpFields, rsvpTotals } from '../../../features/rsvp/rsvp';
import { RsvpFormModal } from '../../../features/rsvp/RsvpFormModal';
import { invitationService, rsvpService } from '../../../services';
import { colors, radius, spacing } from '../../../theme';

/** 참석 응답 명단 (만든 사람): 합계, 직접 넣기·고치기·지우기 (설계 6장) */
export default function RsvpManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [rows, setRows] = useState<RsvpResponse[] | null>(null);
  const [editing, setEditing] = useState<RsvpResponse | 'new' | null>(null);
  const [removing, setRemoving] = useState<RsvpResponse | null>(null);
  // 실패하면 보이던 명단을 그대로 둔다
  const load = useCallback(async () => {
    try {
      setRows(await rsvpService.list(id));
    } catch {
      toast('명단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [id]);
  useEffect(() => {
    invitationService
      .get(id)
      .then(setInv)
      .catch(() => toast('초대장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'))
      .then(load);
  }, [id, load]);
  const themeId = inv?.themeId ?? 'corporate';
  const companions = rsvpFields(themeId).includes('companions');
  const totals = rsvpTotals(rows ?? []);
  const initial = useMemo(() => (editing && editing !== 'new' ? editing : emptyRsvpInput()), [editing]);

  const header = (
    <Header
      title="참석 응답"
      hideBack
      right={
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      }
    />
  );

  return (
    <Screen header={header} background={colors.surface} contentStyle={styles.content}>
      {rows === null ? (
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      ) : (
        <>
          <View style={styles.summary}>
            <Txt weight="semibold">
              {companions
                ? `참석 ${totals.people}명(동반 포함) · 불참 ${totals.declined}명`
                : `참석 ${totals.attending}명 · 불참 ${totals.declined}명`}
            </Txt>
            <Pressable onPress={() => setEditing('new')} style={styles.addBtn} accessibilityRole="button">
              <Ionicons name="add" size={16} color={colors.brand} />
              <Txt variant="caption" weight="semibold" color={colors.brand}>
                응답 추가
              </Txt>
            </Pressable>
          </View>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Txt color={colors.muted}>아직 받은 응답이 없어요.</Txt>
            </View>
          ) : (
            rows.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.flex}>
                  <View style={styles.row}>
                    <Txt weight="semibold" raw>
                      {r.name}
                    </Txt>
                    <Txt variant="caption" color={r.attending ? colors.success : colors.muted}>
                      {r.attending ? '참석' : '불참'}
                    </Txt>
                    {r.source === 'manual' && (
                      <Txt variant="tiny" color={colors.infoInk}>
                        직접 입력
                      </Txt>
                    )}
                  </View>
                  <Txt variant="caption" color={colors.label} raw={!companions}>
                    {companions ? `동반 ${r.companions}명` : [r.org, r.phone].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <Pressable
                  onPress={() => setEditing(r)}
                  style={styles.icon}
                  accessibilityRole="button"
                  accessibilityLabel="고치기"
                >
                  <Ionicons name="create-outline" size={18} color={colors.label} />
                </Pressable>
                <Pressable
                  onPress={() => setRemoving(r)}
                  style={styles.icon}
                  accessibilityRole="button"
                  accessibilityLabel="삭제"
                >
                  <Ionicons name="close" size={18} color={colors.label} />
                </Pressable>
              </View>
            ))
          )}
        </>
      )}
      <RsvpFormModal
        visible={!!editing}
        themeId={themeId}
        initial={initial}
        title={editing === 'new' ? '응답 추가' : '응답 고치기'}
        submitLabel={editing === 'new' ? '추가' : '고치기'}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          try {
            if (editing === 'new') await rsvpService.addManual(id, themeId, input);
            else if (editing) await rsvpService.update(id, themeId, editing.id, input);
          } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'INVALID') return 'invalid';
            if (message === 'RATE_LIMITED') return 'rate_limited';
            throw e; // 폼이 안내한다. 입력 내용은 그대로 둔다
          }
          await load();
          return 'ok';
        }}
      />
      <AppModal
        visible={!!removing}
        title="삭제하시겠습니까?"
        onDismiss={() => setRemoving(null)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setRemoving(null) },
          {
            label: '삭제하기',
            onPress: async () => {
              if (!removing) return;
              try {
                await rsvpService.remove(id, removing.id);
              } catch {
                toast('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
                return;
              }
              setRemoving(null);
              toast('삭제가 완료되었습니다.');
              load();
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
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
