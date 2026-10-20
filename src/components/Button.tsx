import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

/**
 * primary: 시그니처 그린 블록 / outline: 흰 바탕 + 헤어라인 / tint: 옅은 그린 틴트
 * chip: 24px 아웃라인 칩 / kakao·social: 소셜 로그인
 */
type Variant = 'primary' | 'outline' | 'tint' | 'ghost' | 'kakao' | 'social' | 'chip' | 'secondary' | 'light';
type Size = 'lg' | 'md' | 'sm';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const palette: Record<Variant, { bg: string; pressed: string; text: string; border?: string }> = {
  primary: { bg: colors.brand, pressed: colors.brandPressed, text: colors.canvas },
  outline: { bg: colors.canvas, pressed: colors.surface, text: colors.label, border: colors.hairline },
  social: { bg: colors.canvas, pressed: colors.surface, text: colors.label, border: colors.hairline },
  secondary: { bg: colors.canvas, pressed: colors.surface, text: colors.label, border: colors.hairline },
  light: { bg: colors.canvas, pressed: colors.surface, text: colors.label, border: colors.hairline },
  tint: { bg: colors.brandTint, pressed: '#D6E6DD', text: colors.brand },
  ghost: { bg: 'transparent', pressed: colors.surface, text: colors.label },
  chip: { bg: colors.canvas, pressed: colors.surface, text: colors.label, border: colors.hairline },
  kakao: { bg: colors.kakao, pressed: '#F2D900', text: colors.kakaoText },
};

const heights: Record<Size, number> = { lg: 52, md: 44, sm: 32 };

export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, loading, icon, style }: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  const chip = variant === 'chip';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      style={({ pressed }) => [
        styles.base,
        {
          height: chip ? 24 : heights[size],
          borderRadius: chip ? radius.xs : radius.sm,
          paddingHorizontal: chip ? spacing.sm : size === 'sm' ? spacing.md : spacing.lg,
          backgroundColor: disabled ? colors.surfaceStrong : pressed ? p.pressed : p.bg,
          borderColor: disabled ? 'transparent' : (p.border ?? 'transparent'),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Txt
            variant={chip ? 'tiny' : size === 'sm' ? 'caption' : 'subtitle'}
            weight={chip ? 'regular' : 'semibold'}
            color={disabled ? colors.faint : p.text}
          >
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
