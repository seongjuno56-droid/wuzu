import { StyleSheet, View } from 'react-native';

import { Txt } from '../../components/Txt';
import { styleFor } from '../../data/templates';
import { colors, radius } from '../../theme';
import { fitSlide } from '../canvas/model';
import type { Invitation } from '../invitation/model';
import { CoverSlide } from '../invitation/view/CoverSlide';

const W = 120;
const H = 150;
/** 9:16 표지 전체가 들어가는 크기 (높이 기준 맞춤) */
const SLIDE = fitSlide(W, H);

/** 표지 축소 미리보기: 캔버스 표지(꾸민 표지 포함)를 칸에 맞춰 그대로 그린다 */
export function CoverThumb({ invitation, blocked }: { invitation: Invitation; blocked: boolean }) {
  if (blocked) {
    return (
      <View style={[styles.box, styles.center, styles.blocked]}>
        <Txt variant="tiny" color={colors.danger}>
          미리보기 불가
        </Txt>
      </View>
    );
  }
  return (
    <View
      style={[styles.box, styles.center, { backgroundColor: styleFor(invitation.themeId, invitation.templateId, invitation.paletteId).bg }]}
      pointerEvents="none"
    >
      <CoverSlide invitation={invitation} width={SLIDE.width} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: W, height: H, borderRadius: radius.xs, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  blocked: { backgroundColor: colors.surface },
});
