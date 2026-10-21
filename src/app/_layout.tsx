import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import '../features/invitation/registerThemes';
import { PaymentSheetHost } from '../features/wallet/PaymentSheetHost';
import { useSession } from '../store/session';
import { colors, fontSources, MAX_APP_WIDTH } from '../theme';

const FONT_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  const hydrated = useSession((s) => s.hydrated);
  // 하객이 웹으로 여는 초대장은 폴드·태블릿·PC 폭을 그대로 쓴다
  const fullBleed = useSegments()[0] === 'invite';
  // 폰트 CDN이 느리거나 막혀도 시스템 폰트로 계속 진행
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = hydrated && (fontsLoaded || !!fontError || fontTimedOut);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* 웹에서도 폰 폭으로 보이도록 앱 전체를 가운데 고정 폭 프레임에 담는다 */}
        <View style={styles.outer}>
          <View style={[styles.frame, fullBleed && styles.fullBleed]}>
            {ready && (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                {/* WUZU 알림은 별도 페이지가 아닌 풀 모달 */}
                <Stack.Screen name="notifications" options={{ presentation: 'fullScreenModal' }} />
              </Stack>
            )}
            <PaymentSheetHost />
            <ToastHost />
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  outer: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_APP_WIDTH,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  // 웹은 undefined 로 덮으면 무시하므로 100% 로 제한을 푼다
  fullBleed: { maxWidth: '100%' },
});
