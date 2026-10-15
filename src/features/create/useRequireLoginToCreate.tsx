import { router } from 'expo-router';
import { useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { useSession } from '../../store/session';

/** 템플릿 선택/제작하기: 비로그인이면 로그인으로, 로그인이면 다음 단계 준비 중 안내 */
export function useRequireLoginToCreate() {
  const loggedIn = useSession((s) => !!s.user);
  const [notice, setNotice] = useState<string | null>(null);

  const start = (templateName: string) => {
    if (!loggedIn) {
      router.push('/auth/login');
      return;
    }
    setNotice(templateName);
  };

  const modal = (
    <AppModal
      visible={!!notice}
      title={`'${notice}' 템플릿을 선택했어요`}
      message="초대장 편집 화면은 다음 단계에서 만나요!"
      onDismiss={() => setNotice(null)}
      actions={[{ label: '확인', onPress: () => setNotice(null) }]}
    />
  );

  return { start, modal };
}
