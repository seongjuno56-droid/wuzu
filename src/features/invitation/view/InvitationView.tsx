import { View } from 'react-native';

import type { ViewMode } from '../../canvas/types';
import { BgmButton } from './BgmButton';
import { lookFor, LookProvider } from './look';
import { GuestbookHandlers, ViewInvitation } from './PageContent';
import { ScrollInvitation } from './ScrollInvitation';
import { StoryInvitation } from './StoryInvitation';

interface Props extends GuestbookHandlers {
  invitation: ViewInvitation;
  /** 없으면 초대장에 저장된 보기 형태 */
  mode?: ViewMode;
  /** 편집 화면 미리보기에서는 BGM 버튼을 숨긴다 */
  showBgm?: boolean;
}

/**
 * 초대장 전체 — 템플릿 미리보기·편집 미리보기·저장본 보기가 같이 쓴다.
 * 스토리형은 부모가 높이를 정해야 한다 (스크롤 안에 넣지 않는다).
 */
export function InvitationView({ invitation, mode, showBgm = true, ...handlers }: Props) {
  const look = lookFor(invitation.themeId, invitation.templateId, invitation.paletteId);
  const { content, enabled } = invitation;
  const story = (mode ?? invitation.viewMode) === 'story';
  return (
    <LookProvider look={look}>
      <View style={story ? { flex: 1 } : undefined}>
        {story ? (
          <StoryInvitation invitation={invitation} {...handlers} />
        ) : (
          <ScrollInvitation invitation={invitation} {...handlers} />
        )}
        {showBgm && enabled.bgm && content.bgm.uri && <BgmButton bgm={content.bgm} />}
      </View>
    </LookProvider>
  );
}
