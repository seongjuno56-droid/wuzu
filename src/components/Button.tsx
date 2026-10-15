import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'kakao' | 'social';
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
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: colors.textOnPrimary },
  secondary: { bg: colors.primarySoft, pressed: '#D8E8DF', text: colors.primary },
  outline: { bg: colors.bg, pressed: colors.surface, text: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', pressed: colors.surface, text: colors.textSub },
  kakao: { bg: colors.kakao, pressed: '#F2D900', text: colors.kakaoText },
  social: { bg: colors.bg, pressed: colors.surface, text: colors.text, border: colors.border },
};

const heights: Record<Size, number> = { lg: 54, md: 46, sm: 34 };

export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, loading, icon, style }: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          backgroundColor: disabled ? colors.surfaceStrong : pressed ? p.pressed : p.bg,
          borderColor: p.border ?? 'transparent',
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
            variant={size === 'sm' ? 'caption' : 'bodyStrong'}
            weight={size === 'sm' ? 'medium' : 'semibold'}
            color={disabled ? colors.textMuted : p.text}
          >
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
