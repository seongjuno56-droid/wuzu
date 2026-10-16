import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { AppModal } from '../../../components/AppModal';

/**
 * 작성 중(저장 안 된 변경 있음) 화면을 벗어나려 하면 확인 모달을 띄운다.
 * - 앱/브라우저 뒤로가기: beforeRemove
 * - 웹 새로고침·탭 닫기: beforeunload (브라우저 기본 확인창)
 * 저장·'초대장 설정' 이동처럼 의도한 이동 전에는 allow() 를 부른다.
 */
export function useLeaveGuard(dirty: boolean) {
  const navigation = useNavigation();
  const allowed = useRef(false);
  // 막아 둔 이동 동작 (확인 시 그대로 다시 보낸다)
  const [pending, setPending] = useState<object | null>(null);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty || allowed.current) return;
        e.preventDefault();
        setPending(e.data.action);
      }),
    [navigation, dirty],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const modal = (
    <AppModal
      visible={!!pending}
      message={'페이지를 이동하시겠습니까?\n입력한 정보는 저장되지 않습니다.'}
      onDismiss={() => setPending(null)}
      actions={[
        { label: '닫기', variant: 'outline', onPress: () => setPending(null) },
        {
          label: '이동',
          onPress: () => {
            const action = pending;
            setPending(null);
            allowed.current = true;
            if (action) navigation.dispatch(action as Parameters<typeof navigation.dispatch>[0]);
          },
        },
      ]}
    />
  );

  return {
    modal,
    /** 이 다음 이동은 경고 없이 허용 */
    allow: () => {
      allowed.current = true;
    },
  };
}
