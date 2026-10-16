import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { TemplatePreview } from '../../../components/TemplatePreview';
import { getTemplate } from '../../../data/templates';
import { getTheme } from '../../../data/themes';
import { useRequireLoginToCreate } from '../../../features/create/useRequireLoginToCreate';
import { GuestbookModals, GuestbookView } from '../../../features/invitation/GuestbookModals';
import { SAMPLE_GUESTBOOK, sampleInvitation } from '../../../features/invitation/sample';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import type { GuestbookEntry } from '../../../services/types';

/** 템플릿 미리보기 — 결혼식은 실제 초대장과 같은 화면(예시 데이터), 그 외 테마는 표지 샘플 */
export default function TemplateDetail() {
  const { theme: themeId, templateId } = useLocalSearchParams<{ theme: string; templateId: string }>();
  const theme = getTheme(themeId);
  const template = getTemplate(themeId, templateId);
  const { start, modal } = useRequireLoginToCreate();
  const sample = useMemo(() => sampleInvitation(templateId), [templateId]);

  // 미리보기 방명록은 화면 안에서만 동작 (저장하지 않음)
  const [entries, setEntries] = useState<(GuestbookEntry & { password?: string })[]>(SAMPLE_GUESTBOOK);
  const [guestbook, setGuestbook] = useState<GuestbookView>(null);

  if (!theme || !template) return <Redirect href="/create" />;

  return (
    <Screen
      header={<Header title="템플릿 미리보기" />}
      background={template.style.bg}
      footer={
        <BottomCTA>
          <Button label="이 템플릿으로 만들기" onPress={() => start(themeId, templateId, template.name)} />
        </BottomCTA>
      }
    >
      {themeId === 'wedding' ? (
        <InvitationView
          invitation={sample}
          guestbook={entries}
          onGuestbookWrite={() => setGuestbook('write')}
          onGuestbookAll={() => setGuestbook('all')}
        />
      ) : (
        <TemplatePreview template={template} />
      )}
      <GuestbookModals
        view={guestbook}
        onChangeView={setGuestbook}
        entries={entries}
        isOwner={false}
        onAdd={async ({ name, password, content }) => {
          const entry = { id: `local-${Date.now()}`, invitationId: 'sample', name, content, password, createdAt: new Date().toISOString() };
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
      {modal}
    </Screen>
  );
}
