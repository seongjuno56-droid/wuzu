import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '../../../components/AppModal';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import { paletteOfTemplate, styleFor } from '../../../data/templates';
import { CanvasEditor } from '../../../features/canvas/editor/CanvasEditor';
import { canvasForEditing } from '../../../features/canvas/preset';
import type { CanvasDoc } from '../../../features/canvas/types';
import { useEditor } from '../../../features/invitation/editorStore';
import { DockBar } from '../../../features/invitation/editor/DockBar';
import { EditPayModal } from '../../../features/invitation/editor/EditPayModal';
import { dockItems, PAGE_SECTION } from '../../../features/invitation/editor/pages';
import { SavedModal, SaveNameModal } from '../../../features/invitation/editor/SaveModals';
import { SectionSheet } from '../../../features/invitation/editor/SectionSheet';
import { SlideStage } from '../../../features/invitation/editor/SlideStage';
import { useLeaveGuard } from '../../../features/invitation/editor/useLeaveGuard';
import { PaletteDot, PaletteModal } from '../../../features/invitation/editor/PalettePicker';
import { ViewModeModal } from '../../../features/invitation/editor/ViewModePicker';
import { CANVAS_PAGES, PageKey, savedStatus, SectionKey } from '../../../features/invitation/model';
import { canFinalize, sectionTabs } from '../../../features/invitation/themes';
import { screenStatus } from '../../../features/invitation/status';
import { useDraft } from '../../../features/invitation/useDraft';
import { EDIT_COST } from '../../../features/wallet/pricing';
import { usePurchaseFlow } from '../../../features/wallet/usePurchaseFlow';
import { useWallet } from '../../../features/wallet/useWallet';
import { invitationService } from '../../../services';
import { colors, radius, spacing } from '../../../theme';

/**
 * Step 5. 정보 입력 — 가운데: 9:16 슬라이드 / 아래: 독바 / 표지: 직접 꾸미기.
 * 나의 초대장에서 불러온 저장본이면 수정 모드(활성화된 초대장은 수정할 때마다 레터 차감).
 */
export default function EditorCompose() {
  const draft = useDraft();
  const dirty = useEditor((s) => s.dirty);
  const markSaved = useEditor((s) => s.markSaved);
  const applyCanvas = useEditor((s) => s.applyCanvas);
  const resetDesign = useEditor((s) => s.resetDesign);
  const setViewMode = useEditor((s) => s.setViewMode);
  const setPalette = useEditor((s) => s.setPalette);
  const setOrder = useEditor((s) => s.setOrder);
  const origin = useEditor((s) => s.origin);
  const balance = useWallet((s) => s.balance);
  const [active, setActive] = useState(0);
  const [section, setSection] = useState<SectionKey | null>(null);
  // 꾸미는 중인 페이지와 편집기에 넘긴 캔버스 — 초안에는 [완료] 때만 넣는다(취소하면 그대로)
  const [canvas, setCanvas] = useState<{ page: PageKey; initial: CanvasDoc } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [settings, setSettings] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveKind, setSaveKind] = useState<'draft' | 'final' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [paying, setPaying] = useState(false);
  const guard = useLeaveGuard(dirty);
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
  const tabs = sectionTabs(draft);
  const items = dockItems(draft);
  const pages = items.flatMap((d) => (d.kind === 'page' ? [d.page] : []));
  const current = items[Math.min(active, items.length - 1)];
  const currentPage = current.kind === 'page' ? current.page : null;
  const design = currentPage ? draft.design[currentPage] : undefined;

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
      toast('빨간 점이 있는 항목을 먼저 작성해 주세요.');
      const k = missingTab();
      if (k) setSection(k);
      return;
    }
    setSaveKind('final');
  };

  const save = async (name: string) => {
    setSaving(true);
    try {
      const result = await invitationService.save({ ...draft, name, status: savedStatus(saveKind ?? 'draft') });
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

  const selectDock = (i: number) => {
    setActive(i);
    const item = items[i];
    // 정보 칩(기본정보·BGM)은 페이지가 없으니 바로 입력 시트를 연다
    setSection(item.kind === 'info' ? item.section : null);
  };

  const openCanvas = () => {
    if (!currentPage) return;
    setSection(null);
    setCanvas({ page: currentPage, initial: canvasForEditing(design, styleFor(draft.themeId, draft.templateId, draft.paletteId)) });
  };

  // 캔버스 편집 중에는 화면 전체를 편집기에 넘긴다
  if (canvas) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <CanvasEditor
          initial={canvas.initial}
          content={draft.content}
          style={styleFor(draft.themeId, draft.templateId, draft.paletteId)}
          onDone={(doc) => {
            applyCanvas(canvas.page, doc);
            setCanvas(null);
          }}
          onCancel={() => setCanvas(null)}
          onOpenBasic={() => {
            setCanvas(null);
            setSection('basic');
          }}
        />
        {guard.modal}
      </SafeAreaView>
    );
  }

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
      {/* 보기 형태·색상·미리보기 — 헤더가 좁아 무대 위 줄에 둔다 */}
      <View style={styles.subBar}>
        <Pressable onPress={() => setSettings(true)} style={styles.subBtn} accessibilityRole="button" accessibilityLabel="보기 형태 설정">
          <Ionicons name={draft.viewMode === 'story' ? 'albums-outline' : 'reorder-four-outline'} size={16} color={colors.label} />
          <Txt variant="caption" color={colors.label}>
            {draft.viewMode === 'story' ? '스토리형' : '스크롤형'}
          </Txt>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
        <Pressable onPress={() => setPaletteOpen(true)} style={styles.subBtn} accessibilityRole="button" accessibilityLabel="배경 색상">
          <PaletteDot {...styleFor(draft.themeId, draft.templateId, draft.paletteId)} />
          <Txt variant="caption" color={colors.label}>
            색상
          </Txt>
        </Pressable>
        <Pressable
          onPress={() => router.push('/create/editor/preview')}
          style={styles.subBtn}
          accessibilityRole="button"
          accessibilityLabel="미리보기"
        >
          <Ionicons name="eye-outline" size={16} color={colors.label} />
          <Txt variant="caption" color={colors.label}>
            미리보기
          </Txt>
        </Pressable>
      </View>
      <View style={[styles.flex, styles.stage]}>
        <SlideStage
          invitation={draft}
          pages={pages}
          index={currentPage ? pages.indexOf(currentPage) : -1}
          onIndexChange={(i) => setActive(i)}
          onEdit={(page) => setSection(PAGE_SECTION[page])}
        />
        {currentPage && CANVAS_PAGES.includes(currentPage) && !section && (
          <View style={styles.slideActions}>
            <Button
              label={design?.mode === 'canvas' ? '다시 꾸미기' : '직접 꾸미기'}
              variant="tint"
              size="md"
              onPress={openCanvas}
            />
            {design?.mode === 'canvas' && (
              <Button label="템플릿 원래대로" variant="outline" size="md" onPress={() => setConfirmReset(true)} />
            )}
          </View>
        )}
        {section && <SectionSheet section={section} onClose={() => setSection(null)} />}
      </View>
      <DockBar items={items} active={active} invitation={draft} onSelect={selectDock} onReorder={setOrder} />

      <AppModal
        visible={confirmReset}
        title="템플릿 원래대로"
        message="꾸민 내용이 모두 사라집니다."
        onDismiss={() => setConfirmReset(false)}
        actions={[
          { label: '취소', variant: 'outline', onPress: () => setConfirmReset(false) },
          {
            label: '원래대로',
            onPress: () => {
              if (currentPage) resetDesign(currentPage);
              setConfirmReset(false);
            },
          },
        ]}
      />
      <PaletteModal
        visible={paletteOpen}
        value={draft.paletteId ?? paletteOfTemplate(draft.themeId, draft.templateId)}
        onSelect={(id) => {
          // 템플릿 원래 색을 고르면 따로 저장하지 않는다 (템플릿 색을 따름)
          setPalette(id === paletteOfTemplate(draft.themeId, draft.templateId) ? null : id);
          setPaletteOpen(false);
        }}
        onClose={() => setPaletteOpen(false)}
      />
      <ViewModeModal
        visible={settings}
        initial={draft.viewMode}
        confirmLabel="적용"
        onCancel={() => setSettings(false)}
        onConfirm={(m) => {
          setViewMode(m);
          setSettings(false);
        }}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  stage: { backgroundColor: colors.surface },
  slideActions: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
