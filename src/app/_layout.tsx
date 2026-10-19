import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import { PaymentSheetHost } from '../features/wallet/PaymentSheetHost';
import { useSession } from '../store/session';
import { colors, fontSources, MAX_APP_WIDTH } from '../theme';

const FONT_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  const hydrated = useSession((s) => s.hydrated);
  // 폰트 CDN이 느리거나 막혀도 시스템 폰트로 계속 진행
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = hydrated && (fontsLoaded || !!fontError || fontTimedOut);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* 웹에서도 폰 폭으로 보이도록 앱 전체를 가운데 고정 폭 프레임에 담는다 */}
      <View style={styles.outer}>
        <View style={styles.frame}>
          {ready && (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
          )}
          <PaymentSheetHost />
          <ToastHost />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.surfaceStrong, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, backgroundColor: colors.bg, overflow: 'hidden' },
});
