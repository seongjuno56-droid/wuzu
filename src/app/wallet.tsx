import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { toast } from '../components/Toast';
import { Txt } from '../components/Txt';
import { chargeEntries, spendEntries, usageText } from '../features/wallet/history';
import { LETTER_PRODUCTS } from '../features/wallet/pricing';
import { usageGuide } from '../features/wallet/usageGuide';
import { useWallet } from '../features/wallet/useWallet';
import { formatDate } from '../lib/format';
import { LedgerEntry, paymentService, walletService } from '../services';
import { useSession } from '../store/session';
import { colors, radius, spacing } from '../theme';

type Tab = 'charge' | 'charges' | 'usage';
const TABS: Tab[] = ['charge', 'charges', 'usage'];
const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/** My 레터: 레터충전 / 충전내역 / 사용내역 + 이용안내 (`?tab=`으로 시작 탭 지정) */
export default function MyLetters() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const user = useSession((s) => s.user);
  const balance = useWallet((s) => s.balance);
  const refresh = useWallet((s) => s.refresh);
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'charge');
  const [ledger, setLedger] = useState<{ list: LedgerEntry[]; at: Date } | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    refresh();
    setLedger({ list: await walletService.history(user.id), at: new Date() });
  }, [user, refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!user) return <Redirect href="/auth/login" />;

  const charge = async (productId: string) => {
    if (buying) return;
    setBuying(productId);
    try {
      const result = await paymentService.purchase(productId);
      if (result === 'success') {
        const next = await walletService.charge(user.id, productId);
        useWallet.getState().set(next);
        toast(`레터 ${LETTER_PRODUCTS.find((p) => p.id === productId)!.letters}개가 충전되었어요.`);
        load();
      } else if (result === 'failed') {
        toast('결제에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } catch {
      toast('충전하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBuying(null);
    }
  };

  const list = ledger ? (tab === 'charges' ? chargeEntries(ledger.list, ledger.at) : spendEntries(ledger.list, ledger.at)) : null;

  return (
    <Screen
      header={<Header title="My 레터" />}
      contentStyle={styles.content}
      footer={
        <View>
          <Pressable
            onPress={() => setGuide((g) => !g)}
            style={styles.guideBar}
            accessibilityRole="button"
            accessibilityState={{ expanded: guide }}
          >
            <Txt variant="caption" color={colors.label}>
              이용안내
            </Txt>
            <Ionicons name={guide ? 'caret-up' : 'caret-down'} size={12} color={colors.label} />
          </Pressable>
          {guide && (
            <View style={styles.guide}>
              {usageGuide().map((t) => (
                <Txt key={t} variant="tiny" color={colors.label}>
                  • {t}
                </Txt>
              ))}
            </View>
          )}
        </View>
      }
    >
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'charge', label: '레터충전' },
          { value: 'charges', label: '충전내역' },
          { value: 'usage', label: '사용내역' },
        ]}
      />
      <View style={styles.balance}>
        <Txt weight="semibold" color={colors.canvas} style={styles.flex}>
          보유 레터
        </Txt>
        <Txt weight="semibold" color={colors.canvas}>
          {balance ?? '–'}
        </Txt>
      </View>

      {tab === 'charge' ? (
        <>
          <Txt variant="caption" color={colors.label}>
            레터 충전
          </Txt>
          {LETTER_PRODUCTS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => charge(p.id)}
              style={({ pressed }) => [styles.product, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`레터 ${p.letters} ${won(p.price)}`}
            >
              <Txt style={styles.flex}>레터 {p.letters}</Txt>
              {buying === p.id ? (
                <ActivityIndicator color={colors.inkSoft} />
              ) : (
                <View style={styles.price}>
                  <Txt variant="caption" weight="semibold" color={colors.canvas}>
                    {won(p.price)}
                  </Txt>
                </View>
              )}
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Txt variant="caption" color={colors.label}>
            {tab === 'charges' ? '레터 충전' : '사용내역'}
          </Txt>
          {list === null ? (
            <ActivityIndicator color={colors.inkSoft} />
          ) : list.length === 0 ? (
            <Txt color={colors.muted} align="center" style={styles.empty}>
              {tab === 'charges' ? '최근 1년간 충전하신 내역이 없습니다.' : '최근 1년간 사용하신 내역이 없습니다.'}
            </Txt>
          ) : (
            list.map((e) => (
              <View key={e.id} style={styles.card}>
                <View style={styles.flex}>
                  <Txt variant="caption" color={colors.muted}>
                    {formatDate(e.createdAt)}
                  </Txt>
                  {tab === 'usage' && e.invitationNumber && (
                    <Txt variant="caption" color={colors.muted}>
                      초대장 No. {e.invitationNumber}
                    </Txt>
                  )}
                  <Txt weight="semibold">{tab === 'charges' ? '레터 충전' : usageText(e)}</Txt>
                </View>
                <View style={styles.amount}>
                  <Txt weight="semibold" color={tab === 'charges' ? colors.infoInk : colors.danger}>
                    {tab === 'charges' ? `+${e.total}` : `- ${-e.total}`}
                  </Txt>
                  {tab === 'charges' && e.priceWon !== undefined && (
                    <Txt variant="caption">{`${e.priceWon.toLocaleString('ko-KR')}원`}</Txt>
                  )}
                </View>
              </View>
            ))
          )}
          <Txt variant="caption" color={colors.muted} align="center" style={styles.note}>
            최근 1년까지의 내역만 제공합니다.
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  balance: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.lg },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.8 },
  price: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.surface },
  amount: { alignItems: 'flex-end' },
  empty: { paddingVertical: 80 },
  note: { marginTop: spacing.lg },
  guideBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, height: 44, backgroundColor: colors.surfaceStrong },
  guide: { padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.canvas, maxHeight: 320 },
});
