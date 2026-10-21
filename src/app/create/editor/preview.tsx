import { Redirect } from 'expo-router';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { useDraft } from '../../../features/invitation/useDraft';
import { InvitationView } from '../../../features/invitation/view/InvitationView';
import { lookFor } from '../../../features/invitation/view/look';

/** Step5 미리보기: 하객이 볼 모습 그대로 (고른 보기 형태) */
export default function EditorPreview() {
  const draft = useDraft();
  if (!draft) return <Redirect href="/create" />;
  const story = draft.viewMode === 'story';
  return (
    <Screen
      header={<Header title="미리보기" />}
      background={lookFor(draft.themeId, draft.templateId, draft.paletteId).bg}
      scroll={!story}
      contentStyle={story ? { flex: 1 } : undefined}
    >
      <InvitationView invitation={draft} />
    </Screen>
  );
}
