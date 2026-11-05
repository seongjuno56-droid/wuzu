import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { InvitationBody } from '../../features/invitation/GuestInvitationScreen';
import { Invitation } from '../../features/invitation/model';
import { screenStatus } from '../../features/invitation/status';
import { invitationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

/** 앱 안에서 저장된 초대장 보기 (만든 사람의 미리보기). 작성자 본인은 방명록을 비밀번호 없이 지울 수 있다. 하객 링크는 /i/<slug> */
export default function InvitationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [invitation, setInvitation] = useState<Invitation | null | undefined>(undefined);

  useEffect(() => {
    invitationService
      .get(id)
      .then(setInvitation)
      .catch(() => toast('초대장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));
  }, [id]);

  if (invitation === undefined) {
    return (
      <Screen header={<Header title="초대장" />}>
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      </Screen>
    );
  }
  if (!invitation) {
    return (
      <Screen header={<Header title="초대장" />} contentStyle={styles.empty}>
        <Txt variant="title" align="center">
          초대장을 찾을 수 없어요
        </Txt>
        <Txt variant="caption" color={colors.muted} align="center">
          삭제되었거나 주소가 잘못되었어요.
        </Txt>
      </Screen>
    );
  }

  const isOwner = !!user && user.id === invitation.ownerId;
  const status = screenStatus(invitation);

  // 활성화 전·만료·제재 초대장은 하객에게 보이지 않는다 (작성자는 미리보기)
  if (!isOwner && status !== 'active') {
    return (
      <Screen header={<Header title="초대장" />} contentStyle={styles.empty}>
        <Txt variant="title" align="center">
          지금은 볼 수 없는 초대장이에요
        </Txt>
      </Screen>
    );
  }

  const preview = isOwner && status !== 'active';
  return (
    <InvitationBody
      invitation={invitation}
      ownerId={isOwner ? user.id : undefined}
      header={<Header title={invitation.name || '초대장'} />}
      rsvpOff={preview}
      banner={
        preview && (
          <View style={styles.draftBanner}>
            <Txt variant="caption" color={colors.infoInk} align="center">
              {status === 'blocked'
                ? '관리자로부터 제재된 초대장이에요. 하객에게 보이지 않아요.'
                : '미리보기예요. 나의 초대장에서 활성화하면 하객에게 보낼 수 있어요.'}
            </Txt>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 120 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
  draftBanner: { backgroundColor: colors.infoTint, padding: spacing.md },
});
