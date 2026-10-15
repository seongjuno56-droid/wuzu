import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Txt } from './Txt';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** 텍스트 탭: 선택 항목만 600 + 2px 밑줄, 나머지 400 */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.tab, active && styles.active]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Txt variant="subtitle" weight={active ? 'semibold' : 'regular'} color={active ? colors.inkSoft : colors.faint}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
    paddingHorizontal: spacing.sm,
  },
  active: { borderBottomColor: colors.inkSoft },
});
