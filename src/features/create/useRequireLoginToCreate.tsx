import { router } from 'expo-router';
import { useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { useSession } from '../../store/session';
import type { ViewMode } from '../canvas/types';
import { useEditor } from '../invitation/editorStore';

/** 지금 제작할 수 있는 테마 (네 테마 모두) */
const EDITABLE_THEMES = ['wedding', 'dol', 'corporate', 'meetup'];

/**
 * 템플릿 선택/제작하기:
 * 비로그인 → 로그인, 제작 가능한 테마 → 편집 시작(Step3), 그 외 테마 → 준비 중 안내
 */
export function useRequireLoginToCreate() {
  const user = useSession((s) => s.user);
  const [notice, setNotice] = useState<string | null>(null);

  const start = (themeId: string, templateId: string, templateName: string, viewMode: ViewMode = 'story') => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!EDITABLE_THEMES.includes(themeId)) {
      setNotice(templateName);
      return;
    }
    useEditor.getState().start({ ownerId: user.id, themeId, templateId, viewMode });
    router.push('/create/editor/options');
  };

  const modal = (
    <AppModal
      visible={!!notice}
      title="곧 만들 수 있어요"
      message={`'${notice}' 템플릿은 준비 중이에요.\n지금은 결혼식 청첩장과 돌잔치 초대장을 만들 수 있어요.`}
      onDismiss={() => setNotice(null)}
      actions={[{ label: '확인', onPress: () => setNotice(null) }]}
    />
  );

  /** 로그인했고 지금 만들 수 있는 테마인지 (스타일 선택 창을 띄울지 판단) */
  const canEdit = (themeId: string) => !!user && EDITABLE_THEMES.includes(themeId);

  return { start, canEdit, modal };
}
