import type { GuestbookEntry } from '../../../services/types';
import { asWedding, Invitation, PageKey } from '../model';
import { AccountPage } from './AccountPage';
import { CeremonyPage } from './CeremonyPage';
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
  switch (page) {
    case 'greeting':
      return <GreetingPage content={content} />;
    case 'gallery':
      return <GalleryPage gallery={content.gallery} />;
    case 'ceremony':
      return <CeremonyPage ceremony={content.ceremony} />;
    case 'account':
      return <AccountPage account={asWedding(content).account} basic={asWedding(content).basic} />;
    case 'guestbook':
      return (
        <GuestbookPage settings={content.guestbook} entries={guestbook} onWrite={onGuestbookWrite} onViewAll={onGuestbookAll} />
      );
    case 'ending':
      return <EndingPage ending={content.ending} />;
  }
}
