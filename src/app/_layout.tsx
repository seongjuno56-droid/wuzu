import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '../store/session';
import { colors, fontSources } from '../theme';

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
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg }} />
      )}
    </SafeAreaProvider>
  );
}
