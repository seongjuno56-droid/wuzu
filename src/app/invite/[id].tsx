import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Txt';
import { GuestbookModals, GuestbookView } from '../../features/invitation/GuestbookModals';
import { Invitation } from '../../features/invitation/model';
import { screenStatus } from '../../features/invitation/status';
import { InvitationView } from '../../features/invitation/view/InvitationView';
import { GuestbookEntry, invitationService } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

/** 저장된 초대장 보기 (하객이 받는 화면). 작성자 본인은 방명록을 비밀번호 없이 지울 수 있다 */
export default function InvitationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [invitation, setInvitation] = useState<Invitation | null | undefined>(undefined);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookView>(null);

  const loadGuestbook = useCallback(async () => setEntries(await invitationService.listGuestbook(id)), [id]);

  useEffect(() => {
    invitationService.get(id).then(setInvitation);
    loadGuestbook();
  }, [id, loadGuestbook]);

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

  // 활성화 전·만료·제재 초대장은 하객에게 보이지 않는다 (작성자는 미리보기)
  if (!isOwner && screenStatus(invitation) !== 'active') {
    return (
      <Screen header={<Header title="초대장" />} contentStyle={styles.empty}>
        <Txt variant="title" align="center">
          지금은 볼 수 없는 초대장이에요
        </Txt>
      </Screen>
    );
  }

  return (
    <Screen header={<Header title={invitation.name || '초대장'} />} background={colors.surface}>
      {isOwner && screenStatus(invitation) !== 'active' && (
        <View style={styles.draftBanner}>
          <Txt variant="caption" color={colors.infoInk} align="center">
            {screenStatus(invitation) === 'blocked'
              ? '관리자로부터 제재된 초대장이에요. 하객에게 보이지 않아요.'
              : '미리보기예요. 나의 초대장에서 활성화하면 하객에게 보낼 수 있어요.'}
          </Txt>
        </View>
      )}
      <InvitationView
        invitation={invitation}
        guestbook={entries}
        onGuestbookWrite={() => setGuestbook('write')}
        onGuestbookAll={() => setGuestbook('all')}
      />
      <GuestbookModals
        view={guestbook}
        onChangeView={setGuestbook}
        entries={entries}
        isOwner={isOwner}
        onAdd={async (input) => {
          await invitationService.addGuestbook(invitation.id, input);
          await loadGuestbook();
        }}
        onRemove={async (entry, password) => {
          const result = await invitationService.removeGuestbook(
            invitation.id,
            entry.id,
            isOwner && user ? { ownerId: user.id } : { password: password ?? '' },
          );
          if (result === 'ok') await loadGuestbook();
          return result;
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 120 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
  draftBanner: { backgroundColor: colors.infoTint, padding: spacing.md },
});
