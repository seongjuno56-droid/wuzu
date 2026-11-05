import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '../../components/Header';
import { Txt } from '../../components/Txt';
import { TERMS_PRIVACY } from '../../data/terms';
import { colors, spacing } from '../../theme';

export const GUEST_DATA_NOTICE = '입력하신 이름·소속·연락처·내용은 초대장을 만든 분께 전달하기 위해 수집하며, 초대장 기간이 끝나고 30일 뒤 삭제돼요.';

/**
 * 하객 입력 폼 아래의 수집 안내와 처리방침 링크. 체크박스 없이 안내만 한다.
 * 처리방침을 봐도 입력이 사라지지 않게 웹은 새 탭으로 연다.
 * 앱의 폼은 네이티브 모달 안에 있어 화면을 넣어도 모달 뒤로 가므로, 폼 위에 모달로 띄운다.
 */
export function GuestDataNotice() {
  const [open, setOpen] = useState(false);
  const show = () => {
    if (Platform.OS === 'web') {
      Linking.openURL('/privacy').catch(() => {});
      return;
    }
    setOpen(true);
  };
  return (
    <View style={styles.wrap}>
      <Txt variant="tiny" color={colors.muted}>
        {GUEST_DATA_NOTICE}
      </Txt>
      <Pressable onPress={show} hitSlop={8} accessibilityRole="link">
        <Txt variant="tiny" color={colors.muted} style={styles.link}>
          개인정보 처리방침 보기
        </Txt>
      </Pressable>
      {open && (
        <Modal visible animationType="slide" onRequestClose={() => setOpen(false)}>
          <SafeAreaView style={styles.sheet}>
            <Header title="개인정보 처리방침" onBack={() => setOpen(false)} />
            <ScrollView contentContainerStyle={styles.policy}>
              <Txt>{TERMS_PRIVACY}</Txt>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  link: { textDecorationLine: 'underline' },
  sheet: { flex: 1, backgroundColor: colors.canvas },
  policy: { padding: spacing.xl },
});
