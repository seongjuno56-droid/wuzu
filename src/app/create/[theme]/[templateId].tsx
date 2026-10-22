import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { TemplatePreview } from '../../../components/TemplatePreview';
import { getTemplate } from '../../../data/templates';
import { getTheme } from '../../../data/themes';
import type { ViewMode } from '../../../features/canvas/types';
import { useRequireLoginToCreate } from '../../../features/create/useRequireLoginToCreate';
import { ViewModeChips, ViewModeModal } from '../../../features/invitation/editor/ViewModePicker';
import { GuestbookModals, GuestbookView } from '../../../features/invitation/GuestbookModals';
import { SAMPLE_GUESTBOOK, sampleInvitation } from '../../../features/invitation/sample';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import type { GuestbookEntry } from '../../../services/types';

/** 템플릿 미리보기 — 결혼식·돌잔치는 실제 초대장과 같은 화면(예시 데이터), 그 외 테마는 표지 샘플 */
export default function TemplateDetail() {
  const { theme: themeId, templateId } = useLocalSearchParams<{ theme: string; templateId: string }>();
  const theme = getTheme(themeId);
  const template = getTemplate(themeId, templateId);
  const { start, canEdit, modal } = useRequireLoginToCreate();
  const [mode, setMode] = useState<ViewMode>('story');
  const [picking, setPicking] = useState(false);
  const sample = useMemo(() => sampleInvitation(themeId, templateId), [themeId, templateId]);

  // 미리보기 방명록은 화면 안에서만 동작 (저장하지 않음)
  const [entries, setEntries] = useState<(GuestbookEntry & { password?: string })[]>(SAMPLE_GUESTBOOK);
  const [guestbook, setGuestbook] = useState<GuestbookView>(null);

  if (!theme || !template) return <Redirect href="/create" />;
  // 실제 초대장 화면으로 미리 보는 테마 (그 밖은 표지 샘플)
  const wedding = themeId === 'wedding' || themeId === 'dol';

  return (
    <Screen
      header={<Header title="템플릿 미리보기" />}
      background={template.style.bg}
      // 스토리형 미리보기는 화면 높이를 채워 넘긴다
      scroll={!wedding || mode === 'scroll'}
      contentStyle={wedding && mode === 'story' ? { flex: 1 } : undefined}
      footer={
        <BottomCTA>
          <Button
            label="이 템플릿으로 만들기"
            onPress={() => (canEdit(themeId) ? setPicking(true) : start(themeId, templateId, template.name))}
          />
        </BottomCTA>
      }
    >
      {wedding ? (
        <>
          <View style={{ backgroundColor: template.style.bg }}>
            <ViewModeChips value={mode} onChange={setMode} />
          </View>
          <InvitationView
            mode={mode}
            invitation={sample}
            guestbook={entries}
            onGuestbookWrite={() => setGuestbook('write')}
            onGuestbookAll={() => setGuestbook('all')}
          />
        </>
      ) : (
        <TemplatePreview template={template} />
      )}
      <GuestbookModals
        view={guestbook}
        onChangeView={setGuestbook}
        entries={entries}
        isOwner={false}
        onAdd={async ({ name, password, content }) => {
          const entry = {
            id: `local-${Date.now()}`,
            invitationId: 'sample',
            name,
            content,
            password,
            createdAt: new Date().toISOString(),
          };
          setEntries((list) => [entry, ...list]);
        }}
        onRemove={async (entry, password) => {
          const stored = entries.find((e) => e.id === entry.id);
          if (!stored) return 'not_found';
          // 예시 방명록(비밀번호 없음)은 미리보기에서 아무 비밀번호로나 지울 수 있다
          if (stored.password && stored.password !== password) return 'wrong_password';
          setEntries((list) => list.filter((e) => e.id !== entry.id));
          return 'ok';
        }}
      />
      <ViewModeModal
        visible={picking}
        initial={mode}
        confirmLabel="시작하기"
        onCancel={() => setPicking(false)}
        onConfirm={(m) => {
          setPicking(false);
          start(themeId, templateId, template.name, m);
        }}
      />
      {modal}
    </Screen>
  );
}
