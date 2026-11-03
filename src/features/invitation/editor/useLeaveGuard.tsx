import { useFocusEffect, useNavigation, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { AppModal } from '../../../components/AppModal';

/** 웹 브라우저 뒤로가기로 막힌 경우 (다시 보낼 이동 동작이 없다) */
const WEB_BACK = 'web-back' as const;

/**
 * 작성 중(저장 안 된 변경 있음) 화면을 벗어나려 하면 확인 모달을 띄운다.
 * - 앱 뒤로가기(안드로이드 버튼·제스처): usePreventRemove
 * - 웹 브라우저 뒤로가기: usePreventRemove 로는 막히지 않아, 같은 주소의 기록을 하나 더 쌓아 두고
 *   뒤로가기로 그 기록이 빠지는 순간(popstate) 다시 쌓으며 모달을 띄운다
 * - 웹 새로고침·탭 닫기: usePreventRemove 가 브라우저 기본 확인창을 띄운다
 * 저장·'초대장 설정' 이동처럼 의도한 이동 전에는 allow() 를 부른다.
 */
export function useLeaveGuard(dirty: boolean) {
  const navigation = useNavigation();
  // 렌더에 쓰는 값과, popstate 처럼 렌더 밖에서 바로 읽는 값을 함께 둔다
  const [allowedState, setAllowedState] = useState(false);
  const allowed = useRef(false);
  // 화면이 다시 포커스를 얻으면(설정에 다녀온 뒤 등) 경고를 다시 켠다
  useFocusEffect(
    useCallback(() => {
      allowed.current = false;
      setAllowedState(false);
    }, []),
  );
  // 막아 둔 이동 동작 (확인 시 그대로 다시 보낸다)
  const [pending, setPending] = useState<object | typeof WEB_BACK | null>(null);

  const disablePrevention = usePreventRemove(dirty && !allowedState, ({ data }) => setPending(data.action));

  const allow = () => {
    allowed.current = true;
    setAllowedState(true);
    disablePrevention();
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const stay = () => window.history.pushState({ wuzuLeaveGuard: true }, '', window.location.href);
    stay();
    const onPop = () => {
      if (allowed.current) return;
      stay();
      setPending(WEB_BACK);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, [dirty]);

  const leave = () => {
    const action = pending;
    setPending(null);
    allow();
    if (action === WEB_BACK) navigation.goBack();
    else if (action) navigation.dispatch(action as Parameters<typeof navigation.dispatch>[0]);
  };

  const modal = (
    <AppModal
      visible={!!pending}
      message={'페이지를 이동하시겠습니까?\n입력한 정보는 저장되지 않습니다.'}
      onDismiss={() => setPending(null)}
      actions={[
        { label: '닫기', variant: 'outline', onPress: () => setPending(null) },
        { label: '이동', onPress: leave },
      ]}
    />
  );

  return {
    modal,
    /** 이 다음 이동은 경고 없이 허용 */
    allow,
  };
}
