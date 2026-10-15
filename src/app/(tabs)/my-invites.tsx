import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon3D } from '../../components/brand/Icon3D';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { Txt } from '../../components/Txt';
import { colors, spacing } from '../../theme';

type Filter = 'active' | 'ended';

export default function MyInvites() {
  const [filter, setFilter] = useState<Filter>('active');
  return (
    <Screen edges={['top']} header={<Header title="나의 초대장" hideBack divider={false} />}>
      <SegmentedTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: '진행 중' },
          { value: 'ended', label: '지난 초대장' },
        ]}
      />
      <View style={styles.empty}>
        <Icon3D name="loveLetter" size={96} />
        <Txt variant="title" align="center" style={styles.title}>
          {filter === 'active' ? '진행 중인 초대장이 없어요' : '지난 초대장이 없어요'}
        </Txt>
        <Txt variant="caption" color={colors.muted} align="center">
          템플릿을 고르고 내용을 채우면{'\n'}링크로 바로 보낼 수 있어요.
        </Txt>
        <Button label="초대장 만들기" size="md" onPress={() => router.navigate('/create')} style={styles.cta} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl, minHeight: 420 },
  title: { marginTop: spacing.lg },
  cta: { marginTop: spacing.lg, paddingHorizontal: spacing.xxl },
});
