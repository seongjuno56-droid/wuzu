import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { LoadFailed } from '../../components/LoadFailed';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { GuestbookEntry, invitationService, notificationService, rsvpService, usingMockAuth } from '../../services';
import { colors, spacing } from '../../theme';
import { myRsvp, submitWithMyRsvp } from '../rsvp/myRsvp';
import { emptyRsvpInput, isRsvpClosed, RsvpResponse, rsvpNotice } from '../rsvp/rsvp';
import { RsvpFormModal } from '../rsvp/RsvpFormModal';
import { GuestbookModals, GuestbookView } from './GuestbookModals';
import { loadGuestFontsLater } from './guestFonts';
import { Invitation, rsvpOf } from './model';
import { themeDef } from './themes';
import { InvitationView } from './view/InvitationView';
import { lookFor } from './view/look';

interface BodyProps {
  invitation: Invitation;
  /** 만든 사람 본인일 때만. 없으면 하객: 방명록은 하객 목록을 읽고, 글 삭제에 비밀번호를 쓴다 */
  ownerId?: string;
  header?: ReactNode;
  /** 초대장 위 안내 (만든 사람의 미리보기 표시) */
  banner?: ReactNode;
  /** 신청 버튼을 끈다 — 만든 사람의 미리보기에서 자기 명단에 시험 응답이 쌓이지 않게 */
  rsvpOff?: boolean;
}

/** 초대장 본문과 방명록·참석 응답 — 하객 웹(/i/<slug>)과 만든 사람의 미리보기(/invite/<id>)가 같이 쓴다 */
export function InvitationBody({ invitation, ownerId, header, banner, rsvpOff }: BodyProps) {
  const id = invitation.id;
  const isOwner = !!ownerId;
  const listAs = isOwner ? 'owner' : 'guest';
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
      .then((ref) => (ref ? rsvpService.get(id, ref.id, ref.token) : null))
      .then(setMine)
      // 못 읽어도 제출은 저장한 id·토큰으로 하므로 응답이 겹치지 않는다
      .catch(() => {})
      .finally(() => setMineLoaded(true));
  }, [id]);

  // 글 등록·삭제 뒤 새로 읽는 값이라, 실패해도 등록·삭제가 실패한 것처럼 보이면 안 된다. 보이던 목록을 둔다
  const loadGuestbook = useCallback(
    () =>
      invitationService
        .listGuestbook(id, listAs)
        .then(setEntries)
        .catch(() => {}),
    [id, listAs],
  );
  useEffect(() => {
    loadGuestbook();
  }, [loadGuestbook]);

  const story = invitation.viewMode === 'story';
  const settings = rsvpOf(invitation.content);
  const deadline = settings?.deadline ?? '';
  const rsvp =
    settings && invitation.enabled.rsvp && !rsvpOff
      ? { mine, loading: !mineLoaded, closed: isRsvpClosed(deadline, new Date()), onOpen: () => setRsvpOpen(true) }
      : undefined;
  const look = lookFor(invitation.themeId, invitation.templateId, invitation.paletteId);

  return (
    <Screen
      header={header}
      background={look.bg}
      // 스토리형은 화면 높이를 꽉 채워 넘기고, 스크롤형만 세로 스크롤
      scroll={!story}
      contentStyle={story ? { flex: 1 } : undefined}
    >
      {banner}
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
        guestNotice={!isOwner}
        onAdd={async (input) => {
          await invitationService.addGuestbook(id, input);
          await loadGuestbook();
        }}
        onRemove={async (entry, password) => {
          const result = await invitationService.removeGuestbook(id, entry.id, ownerId ? { ownerId } : { password: password ?? '' });
          // 이미 지워진 글도 목록에서 사라지게 새로 읽는다
          if (result === 'ok' || result === 'not_found') await loadGuestbook();
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
          guestNotice={!isOwner}
          onClose={() => setRsvpOpen(false)}
          onSubmit={async (input) => {
            const r = await submitWithMyRsvp(myRsvp, rsvpService, {
              invitationId: id,
              themeId: invitation.themeId,
              deadline,
              input,
            });
            if (!r.ok) return r.reason;
            setMine(r.response);
            // 알림은 아직 기기 안 mock 이다. 실서버에서 하객 기기에 쌓아도 만든 사람에게 가지 않으므로 부르지 않는다
            // (만든 사람은 새 글 표시로 본다, 푸시는 4단계). 하객 응답의 초대장에는 ownerId 도 없다
            if (usingMockAuth && r.created && invitation.ownerId) {
              // 응답은 이미 서버에 들어갔다. 알림은 부가 기능이라 실패해도 실패로 안내하지 않는다(다시 보내면 응답이 겹친다)
              await notificationService
                .add(
                  rsvpNotice({
                    name: r.response.name,
                    invitationId: id,
                    ownerId: invitation.ownerId,
                    at: new Date().toISOString(),
                  }),
                )
                .catch(() => {});
            }
            toast('응답을 보냈어요');
            return 'ok';
          }}
        />
      )}
    </Screen>
  );
}

type Loaded = Awaited<ReturnType<typeof invitationService.getBySlug>>;

/**
 * 하객이 링크로 여는 화면. 로그인이 없고 앱 화면으로 나가는 길도 없다(뒤로 가기·탭 없음).
 * 이 기기에 만든 사람이 로그인해 있어도 하객으로 다룬다 — 세션을 읽지 않는다.
 */
export function GuestInvitationScreen({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    invitationService
      .getBySlug(slug)
      .then((r) => {
        if (stale) return;
        setLoaded(r);
        setFailed(false);
      })
      .catch(() => {
        if (!stale) setFailed(true);
      });
    return () => {
      stale = true;
    };
  }, [slug, attempt]);

  // 초대장이 쓰는 글꼴만 뒤에서 받는다. 앱에서는 이미 읽혀 있어 아무 일도 하지 않는다
  const active = loaded?.state === 'active' ? loaded.invitation : undefined;
  useEffect(() => {
    if (active) return loadGuestFontsLater(lookFor(active.themeId, active.templateId, active.paletteId));
  }, [active]);

  if (failed) {
    return (
      <Screen>
        <LoadFailed
          message="초대장을 불러오지 못했어요."
          onRetry={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      </Screen>
    );
  }
  if (!loaded) {
    return (
      <Screen>
        <ActivityIndicator style={styles.loading} color={colors.inkSoft} />
      </Screen>
    );
  }
  if (loaded.state === 'active' && loaded.invitation) return <InvitationBody invitation={loaded.invitation} />;
  // 숨김·활성화 전·삭제도 서버가 not_found 로 준다
  return (
    <Screen contentStyle={styles.empty}>
      {loaded.state === 'expired' ? (
        <Txt variant="title" align="center">
          기간이 끝난 초대장이에요
        </Txt>
      ) : (
        <>
          <Txt variant="title" align="center">
            초대장을 찾을 수 없어요
          </Txt>
          <Txt variant="caption" color={colors.muted} align="center">
            삭제되었거나 주소가 잘못되었어요.
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 120 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
});
