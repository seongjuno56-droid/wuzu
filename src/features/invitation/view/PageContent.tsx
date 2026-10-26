import type { GuestbookEntry } from '../../../services/types';
import { ddayLine } from '../dol';
import { meetupDdayLine } from '../meetup';
import type { RsvpResponse } from '../../rsvp/rsvp';
import { asWedding, Invitation, isCorporate, isDol, isMeetup, PageKey, withGallery } from '../model';
import { AccountPage } from './AccountPage';
import { CeremonyPage } from './CeremonyPage';
import { ContactPage, CorporateOverviewPage, DirectionsPage, ProgramPage, SpeakersPage } from './CorporatePages';
import { DolAccountPage, DolProfilePage, DolTimelinePage } from './DolPages';
import { EndingPage } from './EndingPage';
import { GalleryPage } from './GalleryPage';
import { GreetingPage } from './GreetingPage';
import { GuestbookPage } from './GuestbookPage';
import { MeetupAccountPage, NoticesPage } from './MeetupPages';
import { RsvpPage } from './RsvpPage';

export type ViewInvitation = Pick<
  Invitation,
  'themeId' | 'templateId' | 'paletteId' | 'content' | 'enabled' | 'order' | 'design' | 'viewMode'
>;

export interface RsvpHandlers {
  /** 이 기기에서 낸 응답 (없으면 null) */
  mine: RsvpResponse | null;
  closed: boolean;
  /** 이 기기의 내 응답을 불러오는 중 — 그동안 버튼을 꺼서 새 줄이 중복으로 생기지 않게 */
  loading?: boolean;
  onOpen: () => void;
}

/** 하객 화면이 받는 동작 — 방명록·참석 신청 */
export interface GuestbookHandlers {
  guestbook?: GuestbookEntry[];
  onGuestbookWrite?: () => void;
  onGuestbookAll?: () => void;
  /** 참석 신청 (없으면 미리보기 — 버튼을 끈다) */
  rsvp?: RsvpHandlers;
}

/** 표지 외 형식 페이지 하나 */
export function PageContent({
  page,
  invitation,
  guestbook = [],
  onGuestbookWrite,
  onGuestbookAll,
  rsvp,
}: { page: Exclude<PageKey, 'cover'>; invitation: ViewInvitation } & GuestbookHandlers) {
  const { content } = invitation;
  if (isCorporate(content)) {
    switch (page) {
      case 'ceremony':
        return <CorporateOverviewPage content={content} />;
      case 'program':
        return <ProgramPage items={content.program.items} title="프로그램" />;
      case 'speakers':
        return <SpeakersPage content={content} />;
      case 'directions':
        return <DirectionsPage content={content} />;
      case 'contact':
        return <ContactPage content={content} />;
      case 'rsvp':
        return <RsvpPage settings={content.rsvp} title="참석 신청" cta="참석 신청하기" rsvp={rsvp} />;
      case 'greeting':
        return <GreetingPage content={content} />;
      case 'ending':
        return <EndingPage ending={content.ending} />;
      default:
        return null; // 기업에 없는 장 (갤러리·방명록·계좌)
    }
  }
  if (isMeetup(content)) {
    // 모임 전용 장 (초대 문구·갤러리·방명록·엔딩은 아래 공통 부품)
    switch (page) {
      case 'program':
        return <ProgramPage items={content.program.items} title="일정표" />;
      case 'notices':
        return <NoticesPage content={content} />;
      case 'account':
        return <MeetupAccountPage content={content} />;
      case 'rsvp':
        return <RsvpPage settings={content.rsvp} title="참석 여부" cta="참석 여부 알려주기" rsvp={rsvp} />;
      case 'ceremony':
        return (
          <CeremonyPage
            ceremony={content.ceremony}
            ddayText={meetupDdayLine}
            todayText="오늘이 모임 날이에요"
            placeTitle="오시는 길"
            venuePlaceholder="장소 이름"
          />
        );
    }
  }
  if (isDol(content)) {
    // 돌잔치 전용 장과 돌잔치 문장 (나머지는 결혼식과 같은 부품)
    if (page === 'profile') return <DolProfilePage content={content} />;
    if (page === 'timeline') return <DolTimelinePage content={content} />;
    if (page === 'account') return <DolAccountPage content={content} />;
    if (page === 'ceremony')
      return (
        <CeremonyPage
          ceremony={content.ceremony}
          ddayText={(n) => ddayLine(content, n)}
          todayText="오늘이 첫 생일이에요"
          placeTitle="오시는 길"
          venuePlaceholder="장소 이름"
        />
      );
  }
  switch (page) {
    case 'greeting':
      return <GreetingPage content={content} />;
    case 'gallery':
      return <GalleryPage gallery={withGallery(content).gallery} />;
    case 'ceremony':
      return <CeremonyPage ceremony={content.ceremony} />;
    case 'account':
      return <AccountPage account={asWedding(content).account} basic={asWedding(content).basic} />;
    case 'guestbook':
      return (
        <GuestbookPage
          settings={withGallery(content).guestbook}
          entries={guestbook}
          onWrite={onGuestbookWrite}
          onViewAll={onGuestbookAll}
        />
      );
    case 'ending':
      return <EndingPage ending={content.ending} />;
  }
}
