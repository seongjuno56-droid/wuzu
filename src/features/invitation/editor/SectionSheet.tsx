import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, radius, shadow, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { SectionKey } from '../model';
import { themeDef, validateFor } from '../themes';
import { CeremonyForm } from './CeremonyForm';
import { BgmForm, EndingForm, GalleryForm } from './MediaForms';
import { AccountForm, BasicForm, GreetingForm, GuestbookForm } from './TextForms';

/** 섹션 입력 바텀시트: ▼ 닫기 / 제목 / ✓ 확인(유효할 때만) */
export function SectionSheet({ section, onClose }: { section: SectionKey; onClose: () => void }) {
  const draft = useEditor((s) => s.draft!);
  const confirm = useEditor((s) => s.confirm);
  const [dragging, setDragging] = useState(false);
  const valid = validateFor(draft, section).length === 0;

  const done = () => {
    if (confirm(section)) onClose();
  };

  return (
    <View style={[styles.sheet, shadow]}>
      <View style={styles.sheetHead}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="바텀시트 닫기">
          <Ionicons name="chevron-down" size={24} color={colors.inkSoft} />
        </Pressable>
        <Txt variant="title" align="center" style={styles.flex}>
          {themeDef(draft.themeId).sectionLabel(section)}
        </Txt>
        <Pressable
          onPress={done}
          disabled={!valid}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="입력 완료"
          accessibilityState={{ disabled: !valid }}
        >
          <Ionicons name="checkmark" size={26} color={valid ? colors.success : colors.placeholder} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.sheetBody}
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'basic' && <BasicForm />}
        {section === 'ceremony' && <CeremonyForm onDragChange={setDragging} />}
        {section === 'greeting' && <GreetingForm />}
        {section === 'account' && <AccountForm />}
        {section === 'gallery' && <GalleryForm onDragChange={setDragging} />}
        {section === 'guestbook' && <GuestbookForm />}
        {section === 'ending' && <EndingForm onDragChange={setDragging} />}
        {section === 'bgm' && <BgmForm />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  sheetHead: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  sheetBody: { padding: spacing.xl, paddingBottom: 48 },
});
