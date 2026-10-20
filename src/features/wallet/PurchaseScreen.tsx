import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { formatDateTime } from '../../lib/format';
import { ExtendDays, invitationService, SpendOrder } from '../../services';
import { colors, radius, spacing } from '../../theme';
import type { Invitation } from '../invitation/model';
import { periodLabel } from '../invitation/status';
import { ACTIVATION, EXTEND_OPTIONS, orderCost, orderLines } from './pricing';
import { usePurchaseFlow } from './usePurchaseFlow';
import { useWallet } from './useWallet';

const NOTICE = {
  activate: [
    '초대장을 활성화 한 시점부터 초대장 사용 기간이 카운트 됩니다.',
    '초대장을 활성화 하기 전까지는 초대장을 무제한으로 수정할 수 있습니다.',
    '초대장 활성화 이후에 초대장을 수정하기를 원하는 경우 별도로 수정권(레터 5)을 구매하여야 합니다.',
    '사용불가 상태의 초대장은 초대장 활성화, 기간 연장이 불가능합니다.',
  ],
  extend: [
    '초대장을 활성화 한 시점부터 초대장 사용 기간이 카운트 됩니다.',
    '이용 기간 연장 시, 기존의 활성화된 기간에 선택한 일자만큼 기간이 추가됩니다.',
    '초대장 활성화 이후에 초대장을 수정하기를 원하는 경우 별도로 수정권(레터 5)을 구매하여야 합니다.',
  ],
};

function Radio({ on, label, cost, listCost, onPress }: { on: boolean; label: string; cost?: number; listCost?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.brand : colors.placeholder} />
      <Txt style={styles.flex}>{label}</Txt>
      {cost !== undefined && (
        <View style={styles.costs}>
          <Txt>{cost}레터</Txt>
          {listCost && (
            <Txt variant="caption" color={colors.faint} style={styles.strike}>
              {listCost}레터
            </Txt>
          )}
        </View>
      )}
    </Pressable>
  );
}

/** 초대장 활성화 / 기간 연장 구매 (설계 4-3, 4-4) */
export function PurchaseScreen({ mode, invitationId }: { mode: 'activate' | 'extend'; invitationId: string }) {
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  const [inv, setInv] = useState<Invitation | null | undefined>(undefined);
  const [days, setDays] = useState<ExtendDays | 0>(0);
  const flow = usePurchaseFlow({
    onDone: () => {
      toast('구매를 완료하였습니다.');
      router.back();
    },
  });

  // 충전하고 돌아오면 잔액만 새로 읽고 선택값은 유지
  useFocusEffect(
    useCallback(() => {
      refresh();
      invitationService.get(invitationId).then(setInv);
    }, [invitationId, refresh]),
  );

  const title = mode === 'activate' ? '초대장 활성화' : '기간 연장 구매';
  const close = (
    <Header
      title={title}
      hideBack
      right={
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="닫기">
          <Ionicons name="close" size={24} color={colors.inkSoft} />
        </Pressable>
      }
    />
  );

  if (inv === undefined) {
    return (
      <Screen header={close}>
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      </Screen>
    );
  }
  if (!inv) {
    return (
      <Screen header={close} contentStyle={styles.center}>
        <Txt color={colors.muted}>초대장을 찾을 수 없어요.</Txt>
      </Screen>
    );
  }

  const order: SpendOrder | null =
    mode === 'activate'
      ? { kind: 'activate', invitationId: inv.id, extendDays: days }
      : days
        ? { kind: 'extend', invitationId: inv.id, extendDays: days }
        : null;
  const lines = order ? orderLines(order) : [];
  const total = order ? orderCost(order) : 0;
  const after = (balance ?? 0) - total;
  const period = periodLabel(inv);

  const buy = () => {
    if (!order) return;
    void flow.ask(order, '상품을 구매하시겠습니까?', mode === 'activate' ? '구매 시 서비스가 활성화 됩니다.' : undefined);
  };

  return (
    <Screen
      header={close}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label={flow.busy ? '처리 중…' : '레터로 구매하기'} onPress={buy} disabled={!order || flow.busy} />
          <Txt variant="tiny" color={colors.muted} align="center">
            <Txt variant="tiny" color={colors.muted} onPress={() => router.push('/about/terms')}>이용약관</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => router.push('/about/terms')}>유료 이용약관</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => router.push('/about/privacy')}>개인정보 처리방침</Txt>
            {' | '}
            <Txt variant="tiny" color={colors.muted} onPress={() => toast('복원할 구매 내역이 없어요.')}>구매 복원</Txt>
          </Txt>
        </View>
      }
    >
      <View style={styles.notice}>
        <View style={styles.noticeHead}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.infoInk} />
          <Txt variant="caption" weight="semibold">
            꼭 확인해 주세요!
          </Txt>
        </View>
        {NOTICE[mode].map((t) => (
          <Txt key={t} variant="tiny" color={colors.muted}>
            • {t}
          </Txt>
        ))}
      </View>

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
      {mode === 'extend' && period && (
        <Txt variant="caption" color={colors.success}>
          {period}
        </Txt>
      )}

      <View style={styles.balance}>
        <Txt weight="semibold" color={colors.canvas}>
          보유 레터
        </Txt>
        <Txt weight="semibold" color={colors.canvas}>
          {balance ?? '–'}
        </Txt>
      </View>

      {mode === 'activate' && (
        <View style={styles.box}>
          <Txt variant="subtitle" weight="semibold">
            이용권 구매
          </Txt>
          <View style={styles.row}>
            <Txt style={styles.flex}>서비스 활성화</Txt>
            <Txt>{ACTIVATION.cost}레터</Txt>
          </View>
          <Txt variant="caption" color={colors.muted}>
            • 공유하기 기능 활성화 (기본 {ACTIVATION.days}일 제공)
          </Txt>
        </View>
      )}

      <View style={styles.box}>
        <Txt variant="subtitle" weight="semibold">
          이용 기간 연장
        </Txt>
        <Txt variant="caption" color={colors.muted}>
          공유할 수 있는 기간을 연장합니다.
        </Txt>
        <Radio on={days === 0} label="선택 안함" onPress={() => setDays(0)} />
        {EXTEND_OPTIONS.map((o) => (
          <Radio key={o.days} on={days === o.days} label={`+${o.days}일`} cost={o.cost} listCost={o.listCost} onPress={() => setDays(o.days)} />
        ))}
      </View>

      <Txt variant="subtitle" weight="semibold">
        구매 정보
      </Txt>
      <View style={styles.row}>
        <Txt variant="caption" style={styles.flex}>
          • 보유중인 레터
        </Txt>
        <Txt variant="caption">{balance ?? '–'} 레터</Txt>
      </View>
      {lines.map((l) => (
        <View key={l.label} style={styles.row}>
          <Txt variant="caption" color={colors.danger} style={styles.flex}>
            • {l.label === '서비스 활성화' ? '서비스 이용료 차감' : l.label}
          </Txt>
          <Txt variant="caption" color={colors.danger}>
            {l.amount} 레터
          </Txt>
        </View>
      ))}
      <Txt weight="semibold" align="right" color={total ? colors.danger : colors.muted}>
        총 {total}레터 차감
      </Txt>
      <View style={styles.divider} />
      <Txt variant="subtitle" weight="semibold" align="right" color={after < 0 ? colors.danger : colors.infoInk}>
        구매 후 남은 레터 {after}
      </Txt>
      {flow.modals}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 80 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.sm },
  notice: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginVertical: spacing.sm,
  },
  box: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  costs: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm },
  footer: { padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.canvas },
});
