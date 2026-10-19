import { Stack } from 'expo-router';

import { colors } from '../../../theme';

export default function InvitationManageLayout() {
  return <Stack screenOptions={{ headerShown: false, presentation: 'modal', contentStyle: { backgroundColor: colors.canvas } }} />;
}
