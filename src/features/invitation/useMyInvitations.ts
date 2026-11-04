import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { toast } from '../../components/Toast';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { Invitation } from './model';
import { screenStatus } from './status';

/** 로그인한 사용자의 초대장 목록 (화면에 돌아올 때마다 새로 읽는다, 최근 저장 순) */
export function useMyInvitations() {
  const userId = useSession((s) => s.user?.id);
  const [list, setList] = useState<Invitation[] | null>(null);
  /** 처음 불러오기가 실패했다. 화면이 [다시 시도] 를 보여 준다 */
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);

  const reload = useCallback(async () => {
    setFailed(false);
    try {
      setList(userId ? await invitationService.list(userId) : []);
      loaded.current = true;
    } catch {
      // 새로고침 실패는 보이던 목록을 두고 안내만 한다. 처음 실패는 빈 목록처럼 보이지 않게 list 를 null 로 둔다
      if (loaded.current) toast('초대장 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      else setFailed(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const active = (list ?? []).filter((i) => screenStatus(i) === 'active');
  return { list, active, failed, reload };
}
