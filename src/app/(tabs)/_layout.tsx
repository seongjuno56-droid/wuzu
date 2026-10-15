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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.bg },
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
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: loggedIn ? '마이페이지' : '로그인',
          tabBarIcon: icon('person', 'person-outline'),
        }}
        listeners={{
          tabPress: (e) => {
            if (!loggedIn) {
              e.preventDefault();
              router.push('/auth/login');
            }
          },
        }}
      />
    </Tabs>
  );
}
