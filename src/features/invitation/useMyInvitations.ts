import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { toast } from '../../components/Toast';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { Invitation } from './model';
import { screenStatus } from './status';

/** 로그인한 사용자의 초대장 목록 (화면에 돌아올 때마다 새로 읽는다, 최근 저장 순) */
export function useMyInvitations() {
  const userId = useSession((s) => s.user?.id);
  const [list, setList] = useState<Invitation[] | null>(null);

  const reload = useCallback(async () => {
    // 실패하면 보이던 목록을 그대로 둔다 (처음이면 빈 목록처럼 보이지 않게 null 로 남는다). 화면에 돌아오면 다시 읽는다
    try {
      setList(userId ? await invitationService.list(userId) : []);
    } catch {
      toast('초대장 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const active = (list ?? []).filter((i) => screenStatus(i) === 'active');
  return { list, active, reload };
}
