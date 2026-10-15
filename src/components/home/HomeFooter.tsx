import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BUSINESS_INFO } from '../../config';
import { colors, fonts, spacing } from '../../theme';
import { Txt } from '../Txt';

const LINKS = ['이용약관', '유료 이용약관', '개인정보 처리방침', '구매 복원'];

export function HomeFooter({ onLinkPress }: { onLinkPress: (label: string) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.links}>
        {LINKS.map((l, i) => (
          <Fragment key={l}>
            {i > 0 && (
              <Txt variant="tiny" color={colors.borderStrong}>
                |
              </Txt>
            )}
            <Pressable onPress={() => onLinkPress(l)}>
              <Txt variant="tiny" weight={l === '개인정보 처리방침' ? 'bold' : 'regular'} color={colors.textSub}>
                {l}
              </Txt>
            </Pressable>
          </Fragment>
        ))}
      </View>
      <Txt style={styles.logo} color={colors.textMuted}>
        wuzu
      </Txt>
      <Txt variant="tiny" color={colors.textMuted} align="center">
        {BUSINESS_INFO.company}   대표 {BUSINESS_INFO.ceo}   사업자등록번호 {BUSINESS_INFO.registrationNo}
        {'\n'}
        {BUSINESS_INFO.address}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceStrong,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  logo: { fontFamily: fonts.bold, fontSize: 18 },
});
