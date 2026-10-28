import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * OAuth 복귀 주소(wuzu://auth/callback). 안드로이드는 브라우저가 돌아올 때 이 딥링크가 라우터로도 들어와
 * 라우트가 없으면 Unmatched Route 화면이 뜬다. 코드 교환은 로그인 화면의 openAuthSessionAsync 결과로
 * 처리하므로 여기서는 아무것도 그리지 않고 바로 비킨다.
 */
export default function AuthCallback() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, []);
  return null;
}
