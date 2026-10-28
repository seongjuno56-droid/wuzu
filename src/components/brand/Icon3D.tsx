import { Image, ImageStyle, StyleProp } from 'react-native';

// Microsoft Fluent Emoji 3D (MIT) — assets/icons/LICENSE.txt 참고
export const ICON_SOURCES = {
  bouquet: require('../../../assets/icons/bouquet.webp'),
  ring: require('../../../assets/icons/ring.webp'),
  money: require('../../../assets/icons/money.webp'),
  stethoscope: require('../../../assets/icons/stethoscope.webp'),
  pencil: require('../../../assets/icons/pencil.webp'),
  cheers: require('../../../assets/icons/cheers.webp'),
  office: require('../../../assets/icons/office.webp'),
  gift: require('../../../assets/icons/gift.webp'),
  leaves: require('../../../assets/icons/leaves.webp'),
  alarm: require('../../../assets/icons/alarm.webp'),
  loveLetter: require('../../../assets/icons/love-letter.webp'),
  party: require('../../../assets/icons/party.webp'),
  palette: require('../../../assets/icons/palette.webp'),
  bell: require('../../../assets/icons/bell.webp'),
} as const;

export type Icon3DName = keyof typeof ICON_SOURCES;

/** 3D 일러스트 아이콘. 장식용이라 스크린리더에서는 숨긴다 */
export function Icon3D({ name, size, style }: { name: Icon3DName; size: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={ICON_SOURCES[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
