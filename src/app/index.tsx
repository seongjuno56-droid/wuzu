import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Linking, Platform, StyleSheet, View } from 'react-native';

import { AppModal } from '../components/AppModal';
import { OpeningEnvelope } from '../components/brand/OpeningEnvelope';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { FORCE_UPDATE, SPLASH_DURATION_MS, STORE_URLS } from '../config';
import { colors, spacing } from '../theme';

/** 봉투 연출이 끝난 뒤 문구를 잠시 보여주고 넘어가는 시간 */
const HOLD_AFTER_OPEN_MS = 600;

export default function Splash() {
  const copy = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(Date.now()).current;

  const onOpened = useCallback(() => {
    Animated.timing(copy, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== 'web' }).start();
    if (FORCE_UPDATE) return;
    const wait = Math.max(HOLD_AFTER_OPEN_MS, SPLASH_DURATION_MS - (Date.now() - startedAt));
    setTimeout(() => router.replace('/home'), wait);
  }, [copy, startedAt]);

  useEffect(() => () => copy.stopAnimation(), [copy]);

  const openStore = () => Linking.openURL(Platform.OS === 'ios' ? STORE_URLS.ios : STORE_URLS.android);

  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <View style={styles.stage}>
        <OpeningEnvelope onDone={onOpened} />
        <Animated.View style={[styles.copy, { opacity: copy }]}>
          <Txt variant="title" align="center">
            우리를 만나게 할 단 한 장의 마법
          </Txt>
          <Txt variant="caption" color={colors.muted} align="center">
            우쥬와 함께 만드는 나만의 초대장
          </Txt>
        </Animated.View>
      </View>

      <AppModal
        visible={FORCE_UPDATE}
        title="새로운 버전이 나왔어요"
        message="업데이트 후 이용해 주세요."
        actions={[{ label: '업데이트하러 가기', onPress: openStore }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  stage: { gap: spacing.xxxl, marginTop: -40 },
  copy: { gap: spacing.xs, paddingHorizontal: spacing.xxl },
});
