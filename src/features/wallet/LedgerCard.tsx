import { StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import type { LedgerEntry } from '../../services/types';
import { colors, radius, spacing } from '../../theme';

const signed = (n: number) => `${n > 0 ? '+' : '- '}${Math.abs(n)}레터`;

/** 이력 카드: 이력No / 일시 / 제목 / 내용 줄과 레터 */
export function LedgerCard({ entry, showInvitation }: { entry: LedgerEntry; showInvitation?: boolean }) {
  return (
    <View style={styles.card}>
      <Txt variant="tiny" color={colors.faint}>
        이력No. {entry.number}
      </Txt>
      <Txt variant="bodyStrong">{formatDateTime(entry.createdAt, '-')}</Txt>
      <Txt weight="semibold">{entry.title}</Txt>
      {showInvitation && entry.invitationName && (
        <Txt variant="caption" color={colors.muted}>
          {entry.invitationName}
        </Txt>
      )}
      {entry.lines.map((l) => (
        <View key={l.label} style={styles.line}>
          <Txt variant="caption" color={colors.label} style={styles.flex}>
            • {l.label}
          </Txt>
          <Txt variant="caption" color={l.amount > 0 ? colors.infoInk : colors.label}>
            {signed(l.amount)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.canvas, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center' },
});
