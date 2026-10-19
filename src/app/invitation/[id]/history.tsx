import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { Invitation } from '../../../features/invitation/model';
import { periodLabel, screenStatus } from '../../../features/invitation/status';
import { LedgerCard } from '../../../features/wallet/LedgerCard';
import { formatDateTime } from '../../../lib/format';
import { invitationService, LedgerEntry, walletService } from '../../../services';
import { useSession } from '../../../store/session';
import { colors, radius, spacing } from '../../../theme';

/** 이력 열람: 활성화·연장·수정 기록 */
export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [inv, setInv] = useState<Invitation | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);

  useEffect(() => {
    invitationService.get(id).then(setInv);
    if (user) walletService.history(user.id, { invitationId: id, kind: 'spend' }).then(setEntries);
  }, [id, user]);

  const active = inv && screenStatus(inv) === 'active';

  return (
    <Screen header={<Header title="이력 열람" />} contentStyle={styles.content}>
      {inv && (
        <View style={styles.info}>
          <View style={styles.meta}>
            <Txt variant="tiny" color={colors.faint}>
              제작일시 {formatDateTime(inv.createdAt)}
            </Txt>
            <Txt variant="tiny" color={colors.faint}>
              초대장No. {inv.number}
            </Txt>
          </View>
          <Txt variant="caption" weight="semibold" color={colors.label}>
            #결혼식 초대장
          </Txt>
          <Txt variant="title">{inv.name}</Txt>
          <Txt variant="caption" color={active ? colors.success : colors.danger}>
            {active ? periodLabel(inv) : '초대장 비활성화'}
          </Txt>
        </View>
      )}
      {entries === null ? (
        <ActivityIndicator color={colors.inkSoft} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Txt color={colors.muted}>이력 정보가 없습니다.</Txt>
        </View>
      ) : (
        entries.map((e) => <LedgerCard key={e.id} entry={e} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  info: { gap: spacing.xs, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm },
});
