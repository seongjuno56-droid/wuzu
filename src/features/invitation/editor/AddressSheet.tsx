import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../../components/Txt';
import { colors, spacing } from '../../../theme';

export interface AddressSearchProps {
  visible: boolean;
  /** failed=true 면 검색 서비스를 불러오지 못한 경우 */
  onClose: (failed?: boolean) => void;
  onSelect: (result: { zonecode: string; address: string; addressDetail: string }) => void;
}

/** 주소 검색 모달의 틀 (제목 + 닫기) */
export function AddressSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.head}>
        <Txt variant="title" style={styles.flex}>
          주소 검색
        </Txt>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="닫기">
          <Ionicons name="close" size={26} color={colors.inkSoft} />
        </Pressable>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, backgroundColor: colors.canvas },
  head: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
});
