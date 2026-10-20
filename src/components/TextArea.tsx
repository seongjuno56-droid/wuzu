import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { useT } from '../i18n';
import { colors, fonts, radius, spacing } from '../theme';
import { Txt } from './Txt';

interface Props {
  label?: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  /** 오류 표시 (빨간 테두리) */
  invalid?: boolean;
  minHeight?: number;
  /** 라벨 오른쪽에 붙는 보조 요소 */
  right?: React.ReactNode;
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** 여러 줄 입력 + (현재/최대) 글자 수 */
export function TextArea({ label, required, value, onChangeText, maxLength, placeholder, invalid, minHeight = 120, right }: Props) {
  const [focused, setFocused] = useState(false);
  const t = useT();
  const borderColor = invalid ? colors.danger : focused ? colors.inkSoft : colors.hairline;
  return (
    <View style={styles.wrap}>
      {(label || right) && (
        <View style={styles.head}>
          {label && (
            <Txt variant="caption" weight="semibold" color={colors.label} style={styles.flex}>
              {label}
              {required && <Txt variant="caption" color={colors.danger}> *</Txt>}
            </Txt>
          )}
          {right}
        </View>
      )}
      <View style={[styles.box, { borderColor }]}>
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          placeholder={placeholder && t(placeholder)}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { minHeight }, webNoOutline]}
        />
        <Txt variant="tiny" color={colors.faint} align="right">
          ({value.length}/{maxLength})
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  box: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, backgroundColor: colors.canvas },
  input: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular, color: colors.ink, textAlignVertical: 'top' },
});
