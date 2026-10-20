import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { appColumn } from '../../theme';
import { usePaymentSheet } from './paymentSheetStore';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/**
 * mock 인앱 결제 시트 — 안드로이드는 Google Play형, 그 외(iOS·웹)는 App Store형.
 * [결제 실패 시험]은 개발 중 실패 화면 확인용 (실제 결제로 바꾸면 없어진다).
 */
export function PaymentSheetHost() {
  const request = usePaymentSheet((s) => s.request);
  const settle = usePaymentSheet((s) => s.settle);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 요청이 바뀌거나 시트가 사라지면 진행 중인 타이머를 정리
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setBusy(false);
    };
  }, [request]);
  if (!request) return null;
  const { product } = request;
  const google = Platform.OS === 'android';
  const title = `레터 ${product.letters + product.bonus}개`;

  const buy = () => {
    setBusy(true);
    // 누른 시점의 요청만 끝낸다
    const target = request;
    timer.current = setTimeout(() => {
      timer.current = null;
      setBusy(false);
      settle('success', target);
    }, 900);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && settle('cancelled')}>
      <Pressable style={styles.dim} onPress={() => !busy && settle('cancelled')} accessibilityLabel="결제 취소">
        <Pressable style={[styles.sheet, google ? styles.google : styles.apple]} onPress={() => {}}>
          <View style={styles.head}>
            <Txt variant="caption" weight="semibold" color={google ? '#202124' : '#000000'}>
              {google ? 'Google Play' : 'App Store'}
            </Txt>
            <Pressable onPress={() => !busy && settle('cancelled')} hitSlop={10} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color="#5F6368" />
            </Pressable>
          </View>
          <View style={styles.product}>
            <View style={styles.appIcon}>
              <Txt variant="caption" weight="semibold" color="#FFFFFF">
                wuzu
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold">{title}</Txt>
              <Txt variant="caption" color="#5F6368">
                wuzu · 인앱 구매
              </Txt>
            </View>
            <Txt weight="semibold">{won(product.price)}</Txt>
          </View>
          <Txt variant="tiny" color="#5F6368">
            {google ? '결제 수단: Google Play 잔액 (테스트)' : '계정: 테스트 Apple 계정'}
          </Txt>
          <Pressable
            onPress={buy}
            disabled={busy}
            style={[styles.buy, google ? styles.buyGoogle : styles.buyApple]}
            accessibilityRole="button"
            accessibilityLabel="구매"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Txt weight="semibold" color="#FFFFFF">
                {google ? '구매' : '구입하기'}
              </Txt>
            )}
          </Pressable>
          <Pressable onPress={() => settle('failed')} disabled={busy} style={styles.fail} accessibilityRole="button">
            <Txt variant="tiny" color="#9AA0A6">
              결제 실패 시험 (개발용)
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { ...appColumn, padding: 20, gap: 14, backgroundColor: '#FFFFFF' },
  apple: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  google: { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#183A2E', alignItems: 'center', justifyContent: 'center' },
  buy: { height: 48, alignItems: 'center', justifyContent: 'center' },
  buyApple: { borderRadius: 12, backgroundColor: '#0A84FF' },
  buyGoogle: { borderRadius: 24, backgroundColor: '#01875F' },
  fail: { alignItems: 'center', paddingBottom: 8 },
});
