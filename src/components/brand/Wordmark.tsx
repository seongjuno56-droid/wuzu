import { Text } from 'react-native';

import { colors, fonts } from '../../theme';

/** wuzu 워드마크 — 브랜드 색은 로고에만 쓴다 */
export function Wordmark({ size = 24, color = colors.brand }: { size?: number; color?: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: fonts.serifBold,
        fontSize: size,
        lineHeight: Math.round(size * 1.2),
        letterSpacing: -size * 0.04,
        color,
      }}
    >
      wuzu
    </Text>
  );
}
