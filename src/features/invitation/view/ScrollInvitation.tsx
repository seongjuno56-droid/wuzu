import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { pageOrder } from '../model';
import { CoverSlide } from './CoverSlide';
import { useLook } from './look';
import { GuestbookHandlers, PageContent, ViewInvitation } from './PageContent';

/** 본문 최대 폭 — 폴드 펼침·태블릿·PC 에서는 가운데 칼럼으로 */
export const SCROLL_MAX_WIDTH = 480;

/** 스크롤형: 9:16 표지 + 나머지 섹션을 세로로 이어 붙인다 */
export function ScrollInvitation({ invitation, ...handlers }: { invitation: ViewInvitation } & GuestbookHandlers) {
  const look = useLook();
  const [width, setWidth] = useState(0);
  const pages = pageOrder(invitation.enabled, invitation.order);
  return (
    <View style={[styles.outer, { backgroundColor: look.bg }]}>
      <View style={styles.column} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {pages.map((page) =>
          page === 'cover' ? (
            width > 0 && <CoverSlide key={page} invitation={invitation} width={width} />
          ) : (
            <PageContent key={page} page={page} invitation={invitation} {...handlers} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center' },
  column: { width: '100%', maxWidth: SCROLL_MAX_WIDTH },
});
