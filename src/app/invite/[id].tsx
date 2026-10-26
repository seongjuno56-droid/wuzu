import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { GuestbookModals, GuestbookView } from '../../features/invitation/GuestbookModals';
import { Invitation, rsvpOf } from '../../features/invitation/model';
import { screenStatus } from '../../features/invitation/status';
import { themeDef } from '../../features/invitation/themes';
import { InvitationView } from '../../features/invitation/view/InvitationView';
import { lookFor } from '../../features/invitation/view/look';
import { myRsvp } from '../../features/rsvp/myRsvp';
import { emptyRsvpInput, isRsvpClosed, RsvpResponse, rsvpNotice } from '../../features/rsvp/rsvp';
import { RsvpFormModal } from '../../features/rsvp/RsvpFormModal';
import { GuestbookEntry, invitationService, notificationService, rsvpService } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

/** 저장된 초대장 보기 (하객이 받는 화면). 작성자 본인은 방명록을 비밀번호 없이 지울 수 있다 */
export default function InvitationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const [invitation, setInvitation] = useState<Invitation | null | undefined>(undefined);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookView>(null);

  // 참석 신청: 이 기기에서 낸 응답을 기억해 다시 열면 보여 주고 고칠 수 있게
  const [mine, setMine] = useState<RsvpResponse | null>(null);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [mineLoaded, setMineLoaded] = useState(false);
  const rsvpInitial = useMemo(() => mine ?? emptyRsvpInput(), [mine]);
  useEffect(() => {
    myRsvp
      .get(id)
      .then((rid) => (rid ? rsvpService.get(id, rid) : null))
      .then((r) => {
        setMine(r);
        setMineLoaded(true);
      });
  }, [id]);

  const loadGuestbook = useCallback(async () => setEntries(await invitationService.listGuestbook(id)), [id]);

  useEffect(() => {
    invitationService.get(id).then(setInvitation);
    invitationService.listGuestbook(id).then(setEntries);
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

  const story = invitation.viewMode === 'story';
  const settings = rsvpOf(invitation.content);
  const deadline = settings?.deadline ?? '';
  // 만든 사람의 미리보기(활성 전)에서는 신청 버튼을 끈다 — 자기 명단에 시험 응답이 쌓이지 않게
  const preview = isOwner && screenStatus(invitation) !== 'active';
  const rsvp =
    settings && invitation.enabled.rsvp && !preview
      ? { mine, loading: !mineLoaded, closed: isRsvpClosed(deadline, new Date()), onOpen: () => setRsvpOpen(true) }
      : undefined;
  const look = lookFor(invitation.themeId, invitation.templateId, invitation.paletteId);

  return (
    <Screen
      header={<Header title={invitation.name || '초대장'} />}
      background={look.bg}
      // 스토리형은 화면 높이를 꽉 채워 넘기고, 스크롤형만 세로 스크롤
      scroll={!story}
      contentStyle={story ? { flex: 1 } : undefined}
    >
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
        rsvp={rsvp}
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
      {rsvp && (
        <RsvpFormModal
          visible={rsvpOpen}
          themeId={invitation.themeId}
          initial={rsvpInitial}
          title={mine ? '응답 고치기' : themeDef(invitation.themeId).pageLabel('rsvp')}
          submitLabel={mine ? '고치기' : '보내기'}
          onClose={() => setRsvpOpen(false)}
          onSubmit={async (input) => {
            const r = await rsvpService.submit({
              invitationId: invitation.id,
              themeId: invitation.themeId,
              deadline,
              input,
              id: mine?.id,
            });
            if (!r.ok) return r.reason;
            setMine(r.response);
            await myRsvp.set(invitation.id, r.response.id);
            if (r.created) {
              await notificationService.add(
                rsvpNotice({
                  name: r.response.name,
                  invitationId: invitation.id,
                  ownerId: invitation.ownerId,
                  at: new Date().toISOString(),
                }),
              );
            }
            toast('응답을 보냈어요');
            return 'ok';
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 120 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
  draftBanner: { backgroundColor: colors.infoTint, padding: spacing.md },
});
