import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
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
            <Txt weight={active ? 'semibold' : 'regular'} color={active ? colors.primary : colors.textSub}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tab: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  active: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
