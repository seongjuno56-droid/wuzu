import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { FindIdForm } from '../../features/auth/FindIdForm';
import { FindPasswordForm } from '../../features/auth/FindPasswordForm';
import { spacing } from '../../theme';

type Tab = 'id' | 'pw';

export default function FindAccount() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'pw' ? 'pw' : 'id');

  return (
    <Screen
      scroll={false}
      header={<Header title={tab === 'id' ? '아이디 찾기' : '비밀번호 찾기'} />}
    >
      <View style={styles.tabs}>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'id', label: '아이디 찾기' },
            { value: 'pw', label: '비밀번호 찾기' },
          ]}
        />
      </View>
      {tab === 'id' ? <FindIdForm /> : <FindPasswordForm />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
});
