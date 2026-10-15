import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { colors, spacing } from '../../theme';

export default function MyInvites() {
  return (
    <Screen edges={['top']} header={<Header title="나의 초대장" hideBack />}>
      <View style={styles.empty}>
        <Ionicons name="mail-open-outline" size={64} color={colors.borderStrong} />
        <Txt variant="subtitle" weight="bold">
          아직 만든 초대장이 없어요
        </Txt>
        <Txt color={colors.textSub} align="center">
          첫 초대장을 만들어 소중한 사람들을 초대해 보세요.
        </Txt>
        <Button label="초대장 만들러 가기" size="md" onPress={() => router.navigate('/create')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
});
