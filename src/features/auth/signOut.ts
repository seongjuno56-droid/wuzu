import { authService } from '../../services';
import { useSession } from '../../store/session';

/** 로그아웃: 서버 세션을 끊고 저장된 회원을 비운다. 세션 끊기가 실패해도(오프라인 등) 앱에서는 로그아웃한다 */
export async function signOut(): Promise<void> {
  try {
    await authService.logout();
  } catch {
    // 남은 세션은 앱 다음 시작 때 restoreSession 이 정리한다
  }
  useSession.getState().logout();
}
