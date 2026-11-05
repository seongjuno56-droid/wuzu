import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';

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

  const pick = async () => {
    const picked = await pickLinkThumb();
    if (picked) setLinkThumb(picked);
  };

  return (
    <View style={styles.group}>
      <FormLabel>링크 썸네일</FormLabel>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} resizeMode="cover" accessibilityLabel="링크 썸네일 미리보기" />
          <View style={styles.actions}>
            <Button label="다시 고르기" variant="chip" onPress={pick} />
            <Button label="지우기" variant="chip" onPress={() => setLinkThumb(null)} />
          </View>
        </>
      ) : (
        <Pressable
          onPress={pick}
          style={[styles.preview, styles.add]}
          accessibilityRole="button"
          accessibilityLabel="링크 썸네일 추가"
        >
          <Ionicons name="add" size={24} color={colors.muted} />
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
