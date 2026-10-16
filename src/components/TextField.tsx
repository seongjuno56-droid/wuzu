import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';
import { Txt } from './Txt';

export type FieldMessage = { type: 'error' | 'success' | 'info'; text: string } | null;

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  message?: FieldMessage;
  /** 문구 없이 빨간 테두리만 (필수 항목 미입력 등) */
  invalid?: boolean;
  secureToggle?: boolean;
  clearable?: boolean;
  right?: ReactNode;
}

// web: 브라우저 기본 포커스 외곽선 제거 (테두리 색으로 대신 표시)
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

const messageColor = { error: colors.danger, success: colors.success, info: colors.infoInk };

export function TextField({
  label,
  required,
  message,
  invalid,
  secureToggle,
  clearable,
  right,
  value,
  onChangeText,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const borderColor =
    message?.type === 'error' || invalid ? colors.danger : focused ? colors.inkSoft : colors.hairline;

  return (
    <View style={styles.wrap}>
      {label && (
        <Txt variant="caption" weight="semibold" color={colors.label}>
          {label}
          {required && (
            <Txt variant="caption" color={colors.danger}>
              {' '}*
            </Txt>
          )}
        </Txt>
      )}
      <View style={[styles.box, { borderColor }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, webNoOutline]}
          {...rest}
        />
        {clearable && !!value && (
          <Pressable onPress={() => onChangeText?.('')} hitSlop={8} accessibilityLabel="입력 지우기">
            <Ionicons name="close-circle" size={20} color={colors.placeholder} />
          </Pressable>
        )}
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityLabel={hidden ? '비밀번호 보기' : '비밀번호 숨기기'}
          >
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
          </Pressable>
        )}
        {right}
      </View>
      {message && (
        <Txt variant="tiny" color={messageColor[message.type]}>
          {message.text}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.canvas,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
    paddingVertical: 12,
  },
});
