import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../../../components/Txt';
import { colors, radius, shadow, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { SectionKey } from '../model';
import { themeDef, validateFor } from '../themes';
import { CeremonyForm } from './CeremonyForm';
import {
  ContactForm,
  CorporateBasicForm,
  CorporateOverviewFields,
  DirectionsForm,
  ProgramForm,
  RsvpSettingsForm,
  SpeakersForm,
} from './CorporateForms';
import { DolAccountForm, DolBasicForm, DolProfileForm, DolTimelineForm } from './DolForms';
import { BgmForm, EndingForm, GalleryForm } from './MediaForms';
import { MeetupAccountForm, MeetupBasicForm, NoticesForm } from './MeetupForms';
import { SheetScroll, SheetScrollContext } from './sheetScroll';
import { AccountForm, BasicForm, GreetingForm, GuestbookForm } from './TextForms';

/** 섹션 입력 바텀시트: ▼ 닫기 / 제목 / ✓ 확인(유효할 때만) */
export function SectionSheet({ section, onClose }: { section: SectionKey; onClose: () => void }) {
  const draft = useEditor((s) => s.draft!);
  const confirm = useEditor((s) => s.confirm);
  const [dragging, setDragging] = useState(false);
  // 목록 끌기가 가장자리에서 시트를 스크롤할 수 있게 위치·크기를 기억한다
  const scrollRef = useRef<ScrollView>(null);
  const frameRef = useRef<View>(null);
  const box = useRef({ y: 0, viewH: 0, contentH: 0, top: 0 });
  const [sheetScroll] = useState<SheetScroll>(() => ({
    scrollBy: (dy) => {
      const b = box.current;
      const next = Math.max(0, Math.min(b.contentH - b.viewH, b.y + dy));
      const moved = next - b.y;
      if (moved) {
        b.y = next;
        scrollRef.current?.scrollTo({ y: next, animated: false });
      }
      return moved;
    },
    viewport: () => (box.current.viewH ? { top: box.current.top, bottom: box.current.top + box.current.viewH } : null),
  }));
  const valid = validateFor(draft, section).length === 0;
  // 돌잔치·기업·모임은 기본 정보 등 따로 쓰는 폼이 있다
  const dol = draft.themeId === 'dol';
  const corp = draft.themeId === 'corporate';
  const meet = draft.themeId === 'meetup';

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
      <View ref={frameRef} style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          onScroll={(e) => {
            box.current.y = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={(_, h) => {
            box.current.contentH = h;
          }}
          onLayout={(e) => {
            box.current.viewH = e.nativeEvent.layout.height;
            frameRef.current?.measureInWindow((_x, y) => {
              box.current.top = y;
            });
          }}
          style={styles.flex}
          contentContainerStyle={styles.sheetBody}
          scrollEnabled={!dragging}
          keyboardShouldPersistTaps="handled"
        >
          <SheetScrollContext.Provider value={sheetScroll}>
            {section === 'basic' &&
              (dol ? (
                <DolBasicForm onDragChange={setDragging} />
              ) : corp ? (
                <CorporateBasicForm />
              ) : meet ? (
                <MeetupBasicForm />
              ) : (
                <BasicForm />
              ))}
            {section === 'profile' && <DolProfileForm />}
            {section === 'timeline' && <DolTimelineForm onDragChange={setDragging} />}
            {section === 'ceremony' && <CeremonyForm onDragChange={setDragging} />}
            {section === 'ceremony' && corp && <CorporateOverviewFields />}
            {section === 'program' && <ProgramForm onDragChange={setDragging} />}
            {section === 'speakers' && <SpeakersForm onDragChange={setDragging} />}
            {section === 'directions' && <DirectionsForm />}
            {section === 'rsvp' && <RsvpSettingsForm />}
            {section === 'contact' && <ContactForm />}
            {section === 'greeting' && <GreetingForm />}
            {section === 'account' && (dol ? <DolAccountForm /> : meet ? <MeetupAccountForm /> : <AccountForm />)}
            {section === 'notices' && <NoticesForm onDragChange={setDragging} />}
            {section === 'gallery' && <GalleryForm onDragChange={setDragging} />}
            {section === 'guestbook' && <GuestbookForm />}
            {section === 'ending' && <EndingForm onDragChange={setDragging} />}
            {section === 'bgm' && <BgmForm />}
          </SheetScrollContext.Provider>
        </ScrollView>
      </View>
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
