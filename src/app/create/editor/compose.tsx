import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { toast } from '../../../components/Toast';
import { useEditor } from '../../../features/invitation/editorStore';
import { SavedModal, SaveNameModal } from '../../../features/invitation/editor/SaveModals';
import { SectionSheet, SectionTabBar } from '../../../features/invitation/editor/SectionSheet';
import { useLeaveGuard } from '../../../features/invitation/editor/useLeaveGuard';
import { canFinalize, SectionKey, sectionTabs } from '../../../features/invitation/model';
import { useDraft } from '../../../features/invitation/useDraft';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import { invitationService } from '../../../services';
import { colors, spacing } from '../../../theme';

/** Step 5. 정보 입력 — 위: 실시간 미리보기 / 아래: 섹션 탭바 + 바텀시트 */
export default function EditorCompose() {
  const draft = useDraft();
  const dirty = useEditor((s) => s.dirty);
  const markSaved = useEditor((s) => s.markSaved);
  const [section, setSection] = useState<SectionKey | null>(null);
  const [saveKind, setSaveKind] = useState<'draft' | 'final' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const guard = useLeaveGuard(dirty);

  if (!draft) return <Redirect href="/create" />;
  const tabs = sectionTabs(draft.enabled);

  const askFinal = () => {
    if (!canFinalize(draft)) {
      const firstMissing = tabs.find((k) => !draft.completed[k]);
      toast('빨간 점이 있는 항목을 먼저 작성해 주세요.');
      if (firstMissing) setSection(firstMissing);
      return;
    }
    setSaveKind('final');
  };

  const save = async (name: string) => {
    setSaving(true);
    try {
      const result = await invitationService.save({
        ...draft,
        name,
        status: saveKind === 'final' ? 'active' : draft.status,
      });
      markSaved(result);
      setSaveKind(null);
      setSaved(true);
    } catch {
      toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const leaveTo = (href: '/home' | '/my-invites') => {
    guard.allow();
    setSaved(false);
    useEditor.getState().reset();
    router.dismissTo(href);
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <Header
        title="정보 입력"
        // [b] 초대장 설정: Step3 로 돌아가되 입력값은 유지
        onBack={() => {
          guard.allow();
          router.dismissTo('/create/editor/options');
        }}
        right={
          <View style={styles.headerActions}>
            <Button label="임시저장" variant="chip" onPress={() => setSaveKind('draft')} />
            <Button label="최종저장" variant="chip" onPress={askFinal} />
          </View>
        }
      />
      <View style={styles.flex}>
        <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.preview}>
          <InvitationView invitation={draft} showBgm={false} />
        </ScrollView>
        {section && <SectionSheet section={section} onClose={() => setSection(null)} />}
      </View>
      <SectionTabBar
        tabs={tabs}
        active={section}
        completed={draft.completed}
        onSelect={(k) => setSection((cur) => (cur === k ? null : k))}
      />

      <SaveNameModal
        visible={!!saveKind}
        kind={saveKind ?? 'draft'}
        initialName={draft.name}
        saving={saving}
        onCancel={() => setSaveKind(null)}
        onSave={save}
      />
      <SavedModal visible={saved} onHome={() => leaveTo('/home')} onMyInvites={() => leaveTo('/my-invites')} />
      {guard.modal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  preview: { paddingBottom: 320 },
});
