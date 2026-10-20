import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** 폼 선택지: 아웃라인 버튼 묶음, 선택 항목은 #111 테두리 + 600 */
export function OptionGroup<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, active && styles.active]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Txt variant="subtitle" weight={active ? 'semibold' : 'regular'} color={active ? colors.inkSoft : colors.muted}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  active: { borderColor: colors.brand },
});
