import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n';
import { useSession } from '../../store/session';
import { colors, fonts } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** 탭 버튼 영역 높이 (홈 바·제스처 영역은 따로 더한다) */
const TAB_H = 60;

function icon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color as string} />
  );
}

export default function TabsLayout() {
  const loggedIn = useSession((s) => !!s.user);
  const t = useT();
  // 아이폰 홈 바(제스처) 영역만큼 아래를 더 비운다 — 높이를 60 으로 고정하면 그 영역이 탭 안으로 들어와 터치가 씹힌다
  const { bottom } = useSafeAreaInsets();
  // 비회원이 나의 초대장·마이페이지 탭을 누르면 로그인으로
  const requireLogin = (e: { preventDefault: () => void }) => {
    if (loggedIn) return;
    e.preventDefault();
    router.push('/auth/login');
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.hairline, borderTopWidth: 1, backgroundColor: colors.canvas, height: TAB_H + bottom, paddingBottom: bottom, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('홈'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="create"
        options={{ title: t('초대장 제작'), tabBarIcon: icon('create', 'create-outline') }}
      />
      <Tabs.Screen
        name="my-invites"
        options={{ title: t('나의 초대장'), tabBarIcon: icon('mail', 'mail-outline') }}
        listeners={{ tabPress: requireLogin }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: t(loggedIn ? '마이페이지' : '로그인'),
          tabBarIcon: icon('person', 'person-outline'),
        }}
        listeners={{ tabPress: requireLogin }}
      />
    </Tabs>
  );
}
