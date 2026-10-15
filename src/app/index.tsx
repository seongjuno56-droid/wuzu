import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Linking, Platform, StyleSheet } from 'react-native';

import { AppModal } from '../components/AppModal';
import { Icon3D } from '../components/brand/Icon3D';
import { Wordmark } from '../components/brand/Wordmark';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { FORCE_UPDATE, SPLASH_DURATION_MS, STORE_URLS } from '../config';
import { colors, spacing } from '../theme';

const useNative = Platform.OS !== 'web';

export default function Splash() {
  // 단 한 번의 연출: 편지가 살짝 떠오르며 나타나고, 로고와 문구가 뒤따른다
  const letter = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        letter.setValue(1);
        copy.setValue(1);
      } else {
        Animated.sequence([
          Animated.timing(letter, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.6)), useNativeDriver: useNative }),
          Animated.timing(copy, { toValue: 1, duration: 350, useNativeDriver: useNative }),
        ]).start();
      }
      if (!FORCE_UPDATE) timer = setTimeout(() => router.replace('/home'), SPLASH_DURATION_MS);
    });
    return () => timer && clearTimeout(timer);
  }, [letter, copy]);

  const openStore = () => Linking.openURL(Platform.OS === 'ios' ? STORE_URLS.ios : STORE_URLS.android);

  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <Animated.View
        style={{
          opacity: letter,
          transform: [
            { translateY: letter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: letter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        }}
      >
        <Icon3D name="loveLetter" size={128} />
      </Animated.View>
      <Animated.View style={[styles.copy, { opacity: copy }]}>
        <Wordmark size={36} />
        <Txt variant="caption" color={colors.muted} align="center">
          우리를 만나게 할 단 한 장의 마법
        </Txt>
      </Animated.View>

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
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingBottom: 60 },
  copy: { alignItems: 'center', gap: spacing.xs },
});
