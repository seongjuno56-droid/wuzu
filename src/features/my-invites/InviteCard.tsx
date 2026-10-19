import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import { colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { periodLabel, screenStatus, ScreenStatus, STATUS_LABEL } from '../invitation/status';
import { ACTIVATION } from '../wallet/pricing';
import { CoverThumb } from './CoverThumb';

export type CardAction = 'complete' | 'activate' | 'extend' | 'share' | 'guestbook' | 'more' | 'preview' | 'delete';

const BADGE: Record<ScreenStatus, { bg: string; fg: string }> = {
  writing: { bg: '#FFF1DB', fg: '#B25E00' },
  inactive: { bg: '#FDE7E7', fg: colors.danger },
  active: { bg: '#E6F4EC', fg: colors.success },
  expired: { bg: '#E8EAF0', fg: '#3A4256' },
  blocked: { bg: '#3A3A3A', fg: '#FFFFFF' },
};

const NOTE: Partial<Record<ScreenStatus, string>> = {
  writing: '작성 완료 후 초대장 활성화 가능',
  inactive: '활성화 전까지 무제한 수정 가능',
  expired: '활성화 전까지 무제한 수정 가능',
  blocked: '관리자로부터 제재받은 초대장',
};

function CardButton({
  label,
  sub,
  onPress,
  disabled,
  flex = 1,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, { flex }, disabled && styles.btnOff, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Txt variant="caption" weight="semibold" color={disabled ? colors.placeholder : colors.label} align="center">
        {label}
      </Txt>
      {sub && (
        <Txt variant="tiny" color={colors.muted} align="center">
          {sub}
        </Txt>
      )}
    </Pressable>
  );
}

/** 나의 초대장 카드 — 상태별 문구·버튼 (설계 4-1) */
export function InviteCard({
  invitation,
  now,
  hasNew,
  onAction,
}: {
  invitation: Invitation;
  now: Date;
  hasNew: boolean;
  onAction: (a: CardAction) => void;
}) {
  const status = screenStatus(invitation, now);
  const badge = BADGE[status];
  const guestbookOn = invitation.enabled.guestbook;
  const more = (
    <Pressable onPress={() => onAction('more')} style={styles.more} accessibilityRole="button" accessibilityLabel="더보기">
      <Ionicons name="ellipsis-vertical" size={18} color={colors.label} />
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <Txt variant="tiny" color={colors.faint}>
          제작일시 {formatDateTime(invitation.createdAt)}
        </Txt>
        <Txt variant="tiny" color={colors.faint}>
          초대장No. {invitation.number}
        </Txt>
      </View>
      <View style={styles.body}>
        <View style={styles.info}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Txt variant="tiny" weight="semibold" color={badge.fg}>
              {STATUS_LABEL[status]}
            </Txt>
          </View>
          <Txt variant="caption" weight="semibold" color={colors.label}>
            #결혼식 초대장
          </Txt>
          <Txt variant="title" numberOfLines={2}>
            {invitation.name || '이름 없는 초대장'}
          </Txt>
          <Txt variant="tiny" color={status === 'active' ? colors.success : colors.muted}>
            {status === 'active' ? periodLabel(invitation) : NOTE[status]}
          </Txt>
        </View>
        <Pressable
          onPress={() => onAction('preview')}
          disabled={status === 'blocked'}
          accessibilityRole="button"
          accessibilityLabel="미리보기"
        >
          <CoverThumb invitation={invitation} blocked={status === 'blocked'} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        {status === 'writing' && (
          <>
            <CardButton label="초대장 완성하러 가기" onPress={() => onAction('complete')} />
            {more}
          </>
        )}
        {(status === 'inactive' || status === 'expired') && (
          <>
            <CardButton label="초대장 활성화" sub={`레터 ${ACTIVATION.cost}`} onPress={() => onAction('activate')} flex={2} />
            <CardButton label="방명록" onPress={() => onAction('guestbook')} disabled={!guestbookOn} />
            {more}
          </>
        )}
        {status === 'active' && (
          <>
            <CardButton label="기간 연장" onPress={() => onAction('extend')} />
            <CardButton label="공유하기" onPress={() => onAction('share')} />
            <CardButton
              label={guestbookOn && hasNew ? '(New) 방명록' : '방명록'}
              onPress={() => onAction('guestbook')}
              disabled={!guestbookOn}
            />
            {more}
          </>
        )}
        {status === 'blocked' && (
          <>
            <CardButton label="관리자로부터 제재된 초대장" onPress={() => {}} disabled flex={4} />
            <Pressable onPress={() => onAction('delete')} style={styles.more} accessibilityRole="button" accessibilityLabel="삭제">
              <Ionicons name="trash-outline" size={18} color={colors.label} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.canvas, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg, gap: spacing.md },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  body: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: spacing.xs },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  btn: {
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.xs,
  },
  btnOff: { backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  more: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.xs },
});
