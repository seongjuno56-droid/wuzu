import { StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { colors, radius } from '../../theme';
import type { Invitation } from '../invitation/model';
import { CoverPage } from '../invitation/view/CoverPage';
import { lookFor, LookProvider } from '../invitation/view/look';

const W = 120;
const H = 150;
const SCALE = W / 360;

/**
 * 표지 축소 미리보기: 360px 폭으로 그린 표지를 1/3 로 줄인다.
 * (표지 캔버스 작업 후에는 CoverSlide 에 폭만 넘기면 된다)
 */
export function CoverThumb({ invitation, blocked }: { invitation: Invitation; blocked: boolean }) {
  const look = lookFor(invitation.themeId, invitation.templateId);
  if (blocked) {
    return (
      <View style={[styles.box, styles.center]}>
        <Txt variant="tiny" color={colors.danger}>
          미리보기 불가
        </Txt>
      </View>
    );
  }
  return (
    <View style={[styles.box, { backgroundColor: look.bg }]} pointerEvents="none">
      <View style={styles.inner}>
        <LookProvider look={look}>
          <CoverPage content={invitation.content} />
        </LookProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: W, height: H, borderRadius: radius.xs, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  // 360 폭을 가운데 기준으로 줄이므로 (W-360)/2 만큼 당긴다
  inner: { position: 'absolute', width: 360, left: (W - 360) / 2, top: -60, transform: [{ scale: SCALE }] },
});
