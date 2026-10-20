import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '../../../components/AppModal';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { toast } from '../../../components/Toast';
import { useEditor } from '../../../features/invitation/editorStore';
import { EditPayModal } from '../../../features/invitation/editor/EditPayModal';
import { SavedModal, SaveNameModal } from '../../../features/invitation/editor/SaveModals';
import { SectionSheet, SectionTabBar } from '../../../features/invitation/editor/SectionSheet';
import { useLeaveGuard } from '../../../features/invitation/editor/useLeaveGuard';
import { canFinalize, savedStatus, SectionKey, sectionTabs } from '../../../features/invitation/model';
import { screenStatus } from '../../../features/invitation/status';
import { useDraft } from '../../../features/invitation/useDraft';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import { EDIT_COST } from '../../../features/wallet/pricing';
import { usePurchaseFlow } from '../../../features/wallet/usePurchaseFlow';
import { useWallet } from '../../../features/wallet/useWallet';
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
  const origin = useEditor((s) => s.origin);
  const balance = useWallet((s) => s.balance);
  const [incomplete, setIncomplete] = useState(false);
  const [paying, setPaying] = useState(false);
  const pay = usePurchaseFlow({
    onDone: (savedInvitation) => {
      markSaved(savedInvitation);
      setPaying(false);
      toast(`수정이 완료되었습니다. (레터 -${EDIT_COST}개 차감)`);
      guard.allow();
      useEditor.getState().reset();
      router.dismissTo('/my-invites');
    },
  });

  if (!draft) return <Redirect href="/create" />;
  const tabs = sectionTabs(draft.enabled);

  // 나의 초대장에서 불러온 저장본이면 수정 모드. 활성화된 초대장은 수정할 때마다 레터 차감
  const editing = !!origin;
  const paid = !!origin && screenStatus(origin) === 'active';

  const missingTab = () => tabs.find((k) => !draft.completed[k]);

  const askPaidEdit = async () => {
    if (!canFinalize(draft)) {
      setIncomplete(true);
      return;
    }
    // 잔액을 아직 모르면 불러온 뒤 보여준다
    if (useWallet.getState().balance === null) await useWallet.getState().refresh();
    setPaying(true);
  };

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
        status: savedStatus(saveKind ?? 'draft'),
      });
      markSaved(result);
      setSaveKind(null);
      setSaved(true);
    } catch (e) {
      if (e instanceof Error && e.message === 'PAID_EDIT_REQUIRED') {
        // 그사이 활성화된 초대장 — 최신 저장본을 기준으로 '수정(레터)' 모드로 바꾼다. 편집 내용은 그대로
        setSaveKind(null);
        const latest = await invitationService.get(draft.id);
        if (latest) useEditor.getState().setOrigin(latest);
        toast('활성화된 초대장이에요. [수정]으로 레터를 사용해 저장해 주세요.');
      } else {
        toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
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
        title={editing ? '초대장 수정' : '정보 입력'}
        // 새로 만들 때 ←는 초대장 설정(Step3), 수정 모드 ←는 나의 초대장으로 (이탈 경고 적용)
        onBack={
          editing
            ? () => router.back()
            : () => {
                guard.allow();
                router.dismissTo('/create/editor/options');
              }
        }
        right={
          <View style={styles.headerActions}>
            {editing && (
              <Button
                label="설정"
                variant="chip"
                onPress={() => {
                  guard.allow();
                  router.push('/create/editor/options');
                }}
              />
            )}
            {!paid && <Button label="임시저장" variant="chip" onPress={() => setSaveKind('draft')} />}
            <Button
              label={editing && origin?.status === 'final' ? '수정' : '최종저장'}
              variant="chip"
              onPress={paid ? askPaidEdit : askFinal}
            />
          </View>
        }
      />
      <View style={styles.flex}>
        <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.preview}>
          <InvitationView mode="scroll" invitation={draft} showBgm={false} />
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
      <AppModal
        visible={incomplete}
        title="초대장 정보를 모두 입력하세요."
        onDismiss={() => setIncomplete(false)}
        actions={[
          {
            label: '확인',
            onPress: () => {
              setIncomplete(false);
              const k = missingTab();
              if (k) setSection(k);
            },
          },
        ]}
      />
      {paid && (
        <EditPayModal
          visible={paying}
          invitation={origin!}
          balance={balance}
          busy={pay.busy}
          onCancel={() => setPaying(false)}
          onPay={() => {
            // 결제 결과 모달(레터 부족 등)과 겹치지 않게 먼저 닫는다
            setPaying(false);
            if ((useWallet.getState().balance ?? 0) < EDIT_COST) {
              pay.lack();
              return;
            }
            void pay.run({ kind: 'edit', invitation: draft });
          }}
        />
      )}
      {pay.modals}
      {guard.modal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  preview: { paddingBottom: 320 },
});
