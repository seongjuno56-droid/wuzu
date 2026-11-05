import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { colors, radius, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { pickLinkThumb, userLinkThumb } from '../linkThumb';
import { FormLabel, Hint } from './fields';

/**
 * 링크 썸네일 입력 (선택 항목, 네 테마의 기본 정보 폼이 함께 쓴다).
 * 대체 이미지는 저장할 때 알아서 만들어지므로 여기서는 직접 올린 값만 보여 준다.
 */
export function LinkThumbField() {
  const uri = useEditor((s) => userLinkThumb(s.draft!));
  const setLinkThumb = useEditor((s) => s.setLinkThumb);

  const [busy, setBusy] = useState(false);
  // 상태 값은 다음 그리기까지 옛 값이라, 연달아 누르는 것은 ref 로 막는다
  const picking = useRef(false);

  const pick = async () => {
    if (picking.current) return;
    picking.current = true;
    setBusy(true);
    // 고르는 동안 시트를 닫고 다른 초대장을 열었을 수 있다. 그 초안에 넣지 않는다
    const session = useEditor.getState().session;
    try {
      const picked = await pickLinkThumb();
      if (picked && useEditor.getState().session === session) setLinkThumb(picked);
    } finally {
      picking.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.group}>
      <FormLabel>링크 썸네일</FormLabel>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} resizeMode="cover" accessibilityLabel="링크 썸네일 미리보기" />
          <View style={styles.actions}>
            <Button label="다시 고르기" variant="chip" onPress={pick} loading={busy} />
            <Button label="지우기" variant="chip" onPress={() => setLinkThumb(null)} disabled={busy} />
          </View>
        </>
      ) : (
        <Pressable
          onPress={pick}
          disabled={busy}
          style={[styles.preview, styles.add]}
          accessibilityRole="button"
          accessibilityLabel="링크 썸네일 추가"
          accessibilityState={{ disabled: busy, busy }}
        >
          {busy ? <ActivityIndicator color={colors.muted} /> : <Ionicons name="add" size={24} color={colors.muted} />}
        </Pressable>
      )}
      <Hint>권장 800×400px (가로:세로 2:1), JPG·PNG</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  preview: { width: '100%', aspectRatio: 2, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
  },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
