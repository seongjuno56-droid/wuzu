import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import '../features/invitation/registerThemes';
import { colors } from '../theme';

/**
 * 공개 웹의 뿌리. 앱의 src/app/_layout 과 달리 세션·결제·글꼴 대기가 없다.
 * 글꼴을 기다리지 않고 바로 그린다: 표지는 3초 안에 보여야 하고 글꼴은 파일 하나가 1.5MB 를 넘는다.
 * 초대장이 쓰는 글꼴만 하객 화면이 뒤에서 받는다(guestFonts.ts).
 * GestureHandlerRootView 를 두지 않는다: 하객 화면은 제스처 처리기를 쓰지 않고, 이것만으로 reanimated 까지 JS 900KB 가 늘어난다.
 */
export default function GuestSiteLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: colors.bg, overflow: 'hidden' },
});
