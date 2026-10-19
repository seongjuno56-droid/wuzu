import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * 레터 사용 전 본인 확인. 웹이거나 생체정보가 없으면 확인 모달만으로 진행(true).
 * 사용자가 취소하거나 실패하면 false.
 */
export async function confirmWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: '구매를 확인해 주세요', cancelLabel: '취소' });
    return result.success;
  } catch {
    // 인증 모듈 오류는 확인 모달을 거쳤으므로 진행
    return true;
  }
}
