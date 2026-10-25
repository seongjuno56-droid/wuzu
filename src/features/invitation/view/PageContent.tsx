import type { GuestbookEntry } from '../../../services/types';
import { ddayLine } from '../dol';
import { asWedding, Invitation, isDol, PageKey, withGallery } from '../model';
import { AccountPage } from './AccountPage';
import { CeremonyPage } from './CeremonyPage';
import { DolAccountPage, DolProfilePage, DolTimelinePage } from './DolPages';
import { EndingPage } from './EndingPage';
import { GalleryPage } from './GalleryPage';
import { GreetingPage } from './GreetingPage';
import { GuestbookPage } from './GuestbookPage';

export type ViewInvitation = Pick<
  Invitation,
  'themeId' | 'templateId' | 'paletteId' | 'content' | 'enabled' | 'order' | 'design' | 'viewMode'
>;

export interface GuestbookHandlers {
  guestbook?: GuestbookEntry[];
  onGuestbookWrite?: () => void;
  onGuestbookAll?: () => void;
}

/** 표지 외 형식 페이지 하나 */
export function PageContent({
  page,
  invitation,
  guestbook = [],
  onGuestbookWrite,
  onGuestbookAll,
}: { page: Exclude<PageKey, 'cover'>; invitation: ViewInvitation } & GuestbookHandlers) {
  const { content } = invitation;
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
