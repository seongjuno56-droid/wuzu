import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Invitation } from '../../features/invitation/model';
import { screenStatus } from '../../features/invitation/status';
import type { User } from '../../services/types';
import { colors, radius, shadow, spacing } from '../../theme';
import { Icon3D } from '../brand/Icon3D';
import { Button } from '../Button';
import { Txt } from '../Txt';

interface Props {
  user: User | null;
  /** 내 초대장 전체 (최근 저장 순). 불러오는 중이면 null */
  invitations: Invitation[] | null;
}

/**
 * 초대장 현황 카드 — 설계의 3가지 상태
 * 비회원: 로그인 유도 / 회원·초대장 있음: 활성화 수·최근 제작 / 회원·0장: 제작 유도
 */
export function InvitationStatusCard({ user, invitations }: Props) {
  if (!user) {
    return (
      <View style={[styles.card, shadow]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Txt variant="title">WUZU에 온 것을 환영해요!</Txt>
            <Txt variant="caption" color={colors.muted} style={styles.sub}>
              초대장을 만들기 위해 먼저 로그인 해주세요.
            </Txt>
          </View>
          <Icon3D name="loveLetter" size={64} />
        </View>
        <Button label="로그인" onPress={() => router.push('/auth/login')} />
      </View>
    );
  }

  const list = invitations ?? [];
  const activeCount = list.filter((i) => screenStatus(i) === 'active').length;
  const count = (
    <View style={styles.countRow}>
      <Txt color={colors.muted} style={styles.flex}>
        현재 활성화 중인 초대장
      </Txt>
      {/* 불러오는 동안 0장으로 보이지 않게 */}
      <Txt variant="headline">{invitations ? `${activeCount}장` : '–'}</Txt>
    </View>
  );

  if (invitations && list.length === 0) {
    return (
      <View style={[styles.card, shadow]}>
        <Txt variant="title">
          {user.name}님만의 초대장이{'\n'}정말 기대되네요!
        </Txt>
        {count}
        <Button label="나만의 초대장 제작하기" onPress={() => router.navigate('/create')} />
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
      onPress={() => router.navigate('/my-invites')}
      accessibilityRole="button"
      accessibilityLabel={`${user.name}님의 초대장 현황, 나의 초대장으로 이동`}
    >
      <View style={styles.row}>
        <Txt variant="title" style={styles.flex}>
          {user.name}님의 초대장 현황
        </Txt>
        <Ionicons name="chevron-forward-circle-outline" size={22} color={colors.muted} />
      </View>
      {count}
      <View style={styles.recentRow}>
        <Txt variant="caption" color={colors.muted}>
          최근 제작
        </Txt>
        <Txt variant="caption" weight="semibold" style={styles.flex} numberOfLines={1}>
          {invitations ? (list[0]?.name ?? '-') : ''}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.canvas, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sub: { marginTop: spacing.xs },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
