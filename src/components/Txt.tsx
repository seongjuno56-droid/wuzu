import { Text, TextProps } from 'react-native';

import { translateChildren, useLocale } from '../i18n';
import { colors, fonts, FontWeightName, typography, TypographyVariant } from '../theme';

interface Props extends TextProps {
  variant?: TypographyVariant;
  weight?: FontWeightName;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** 모든 화면 글자 — 한국어 원문을 지금 언어로 번역해 그린다 (사용자 입력처럼 사전에 없는 글자는 그대로) */
export function Txt({ variant = 'body', weight, color = colors.text, align, style, children, accessibilityLabel, ...rest }: Props) {
  const locale = useLocale((s) => s.locale);
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
      accessibilityLabel={accessibilityLabel && translateChildren(accessibilityLabel, locale)}
      {...rest}
    >
      {translateChildren(children, locale)}
    </Text>
  );
}
