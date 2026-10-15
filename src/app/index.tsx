import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppModal } from '../components/AppModal';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { FORCE_UPDATE, SPLASH_DURATION_MS, STORE_URLS } from '../config';
import { colors, fonts, spacing } from '../theme';

export default function Splash() {
  useEffect(() => {
    if (FORCE_UPDATE) return;
    const t = setTimeout(() => router.replace('/home'), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const openStore = () => Linking.openURL(Platform.OS === 'ios' ? STORE_URLS.ios : STORE_URLS.android);

  return (
    <Screen scroll={false} background={colors.primary}>
      <View style={styles.wrap}>
        <View style={styles.envelope}>
          <Ionicons name="mail-open" size={150} color={colors.accent} />
        </View>
        <View style={styles.brand}>
          <Txt variant="subtitle" color={colors.accentSoft}>
            우리를 만나게 할 단 한 장의 마법
          </Txt>
          <Txt style={styles.logo} color={colors.textOnPrimary}>
            wuzu
          </Txt>
        </View>
        <View style={styles.copy}>
          <Txt color="rgba(255,255,255,0.8)">우쥬와 함께 만드는{'\n'}나만의 특별한 초대장</Txt>
          <Txt variant="bodyStrong" weight="bold" color={colors.textOnPrimary}>
            지금부터 새로운 만남을 준비해 볼까요?
          </Txt>
        </View>
      </View>

      <AppModal
        visible={FORCE_UPDATE}
        title="새로운 버전이 나왔어요!"
        message="업데이트 후 이용해주세요."
        actions={[{ label: '업데이트하러 가기', onPress: openStore }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.xxxl, justifyContent: 'center', gap: spacing.xxxl },
  envelope: { position: 'absolute', top: 24, right: -20, transform: [{ rotate: '-28deg' }], opacity: 0.9 },
  brand: { gap: spacing.sm, marginTop: 80 },
  logo: { fontFamily: fonts.bold, fontSize: 64, lineHeight: 72, letterSpacing: -1.5 },
  copy: { gap: spacing.lg, marginTop: 40 },
});
