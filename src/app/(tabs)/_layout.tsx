import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useSession } from '../../store/session';
import { colors, fonts } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color as string} />
  );
}

export default function TabsLayout() {
  const loggedIn = useSession((s) => !!s.user);
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
        tabBarStyle: { borderTopColor: colors.hairline, borderTopWidth: 1, backgroundColor: colors.canvas, height: 60 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="create"
        options={{ title: '초대장 제작', tabBarIcon: icon('create', 'create-outline') }}
      />
      <Tabs.Screen
        name="my-invites"
        options={{ title: '나의 초대장', tabBarIcon: icon('mail', 'mail-outline') }}
        listeners={{ tabPress: requireLogin }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: loggedIn ? '마이페이지' : '로그인',
          tabBarIcon: icon('person', 'person-outline'),
        }}
        listeners={{ tabPress: requireLogin }}
      />
    </Tabs>
  );
}
