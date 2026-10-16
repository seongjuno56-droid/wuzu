import { router } from 'expo-router';
import { useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { useSession } from '../../store/session';
import { useEditor } from '../invitation/editorStore';

/** 지금은 결혼식 초대장만 제작할 수 있다 */
const EDITABLE_THEMES = ['wedding'];

/**
 * 템플릿 선택/제작하기:
 * 비로그인 → 로그인, 결혼식 → 편집 시작(Step3), 그 외 테마 → 준비 중 안내
 */
export function useRequireLoginToCreate() {
  const user = useSession((s) => s.user);
  const [notice, setNotice] = useState<string | null>(null);

  const start = (themeId: string, templateId: string, templateName: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!EDITABLE_THEMES.includes(themeId)) {
      setNotice(templateName);
      return;
    }
    useEditor.getState().start({ ownerId: user.id, themeId, templateId });
    router.push('/create/editor/options');
  };

  const modal = (
    <AppModal
      visible={!!notice}
      title="곧 만들 수 있어요"
      message={`'${notice}' 템플릿은 준비 중이에요.\n지금은 결혼식 청첩장을 먼저 만들 수 있어요.`}
      onDismiss={() => setNotice(null)}
      actions={[{ label: '확인', onPress: () => setNotice(null) }]}
    />
  );

  return { start, modal };
}
