import { Fragment } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { GuestbookEntry } from '../../../services/types';
import { Invitation, pageOrder } from '../model';
import { AccountPage } from './AccountPage';
import { BgmButton } from './BgmButton';
import { CeremonyPage } from './CeremonyPage';
import { CoverSlide } from './CoverSlide';
import { EndingPage } from './EndingPage';
import { GalleryPage } from './GalleryPage';
import { GreetingPage } from './GreetingPage';
import { GuestbookPage } from './GuestbookPage';
import { lookFor, LookProvider } from './look';

interface Props {
  invitation: Pick<Invitation, 'themeId' | 'templateId' | 'content' | 'enabled' | 'order' | 'design'>;
  guestbook?: GuestbookEntry[];
  onGuestbookWrite?: () => void;
  onGuestbookAll?: () => void;
  /** 편집 화면 미리보기에서는 BGM 버튼을 숨긴다 */
  showBgm?: boolean;
}

/** 초대장 한 장 전체 — 템플릿 미리보기·편집 미리보기·저장본 보기가 같이 쓴다 */
export function InvitationView({ invitation, guestbook = [], onGuestbookWrite, onGuestbookAll, showBgm = true }: Props) {
  const { width } = useWindowDimensions();
  const look = lookFor(invitation.themeId, invitation.templateId);
  const { content, enabled } = invitation;

  return (
    <LookProvider look={look}>
      <View style={{ backgroundColor: look.bg }}>
        {showBgm && enabled.bgm && content.bgm.uri && <BgmButton bgm={content.bgm} />}
        {pageOrder(enabled, invitation.order).map((page) => (
          <Fragment key={page}>
            {page === 'cover' && <CoverSlide invitation={invitation} width={Math.min(width, 480)} />}
            {page === 'greeting' && <GreetingPage content={content} />}
            {page === 'gallery' && <GalleryPage gallery={content.gallery} />}
            {page === 'ceremony' && <CeremonyPage ceremony={content.ceremony} />}
            {page === 'account' && <AccountPage account={content.account} basic={content.basic} />}
            {page === 'guestbook' && (
              <GuestbookPage
                settings={content.guestbook}
                entries={guestbook}
                onWrite={onGuestbookWrite}
                onViewAll={onGuestbookAll}
              />
            )}
            {page === 'ending' && <EndingPage ending={content.ending} />}
          </Fragment>
        ))}
      </View>
    </LookProvider>
  );
}
