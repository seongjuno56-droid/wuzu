import { Image, ImageStyle, StyleProp } from 'react-native';

// Microsoft Fluent Emoji 3D (MIT) — assets/icons/LICENSE.txt 참고
const SOURCES = {
  bride: require('../../../assets/icons/bride.webp'),
  groom: require('../../../assets/icons/groom.webp'),
  baby: require('../../../assets/icons/baby.webp'),
  cheers: require('../../../assets/icons/cheers.webp'),
  office: require('../../../assets/icons/office.webp'),
  champagne: require('../../../assets/icons/champagne.webp'),
  gift: require('../../../assets/icons/gift.webp'),
  leaves: require('../../../assets/icons/leaves.webp'),
  alarm: require('../../../assets/icons/alarm.webp'),
  loveLetter: require('../../../assets/icons/love-letter.webp'),
  party: require('../../../assets/icons/party.webp'),
  palette: require('../../../assets/icons/palette.webp'),
  bell: require('../../../assets/icons/bell.webp'),
} as const;

export type Icon3DName = keyof typeof SOURCES;

/** 3D 일러스트 아이콘. 장식용이라 스크린리더에서는 숨긴다 */
export function Icon3D({ name, size, style }: { name: Icon3DName; size: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={SOURCES[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
