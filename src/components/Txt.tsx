import { Text, TextProps } from 'react-native';

import { colors, fonts, FontWeightName, typography, TypographyVariant } from '../theme';

interface Props extends TextProps {
  variant?: TypographyVariant;
  weight?: FontWeightName;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Txt({ variant = 'body', weight, color = colors.text, align, style, ...rest }: Props) {
  const t = typography[variant];
  return (
    <Text
      style={[
        {
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.tracking,
          fontFamily: fonts[weight ?? t.weight],
          color,
        },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
