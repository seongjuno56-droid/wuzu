import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';
import { Txt } from './Txt';

export type FieldMessage = { type: 'error' | 'success' | 'info'; text: string } | null;

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  message?: FieldMessage;
  secureToggle?: boolean;
  clearable?: boolean;
  right?: ReactNode;
}

const messageColor = { error: colors.danger, success: colors.success, info: colors.info };

export function TextField({ label, message, secureToggle, clearable, right, value, onChangeText, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const borderColor = message?.type === 'error' ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      {label && (
        <Txt variant="caption" weight="medium" color={colors.textSub}>
          {label}
        </Txt>
      )}
      <View style={[styles.box, { borderColor }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          {...rest}
        />
        {clearable && !!value && (
          <Pressable onPress={() => onChangeText?.('')} hitSlop={8} accessibilityLabel="입력 지우기">
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityLabel={hidden ? '비밀번호 보기' : '비밀번호 숨기기'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textSub} />
          </Pressable>
        )}
        {right}
      </View>
      {message && (
        <Txt variant="caption" color={messageColor[message.type]}>
          {message.text}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  box: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 14,
    outlineWidth: 0, // web: 기본 포커스 외곽선 제거 (박스 테두리로 대신 표시)
  },
});
