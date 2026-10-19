import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { Invitation } from './model';
import { screenStatus } from './status';

/** 로그인한 사용자의 초대장 목록 (화면에 돌아올 때마다 새로 읽는다, 최근 저장 순) */
export function useMyInvitations() {
  const userId = useSession((s) => s.user?.id);
  const [list, setList] = useState<Invitation[] | null>(null);

  const reload = useCallback(async () => {
    setList(userId ? await invitationService.list(userId) : []);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const active = (list ?? []).filter((i) => screenStatus(i) === 'active');
  return { list, active, reload };
}
