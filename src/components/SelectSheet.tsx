import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appColumn, colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Txt } from './Txt';

interface Props<T extends string | number> {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** 바텀시트 단일 선택: 고른 항목은 검정 바탕, [선택]으로 확정 */
export function SelectSheet<T extends string | number>({ visible, title, options, value, onSelect, onClose }: Props<T>) {
  const [picked, setPicked] = useState(value);
  // 시트가 열릴 때(또는 값이 바뀔 때) 선택값을 맞춘다
  const [synced, setSynced] = useState({ visible, value });
  if (synced.visible !== visible || synced.value !== value) {
    setSynced({ visible, value });
    if (visible) setPicked(value);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber} />
            <Txt variant="title" style={styles.title}>
              {title}
            </Txt>
            {options.map((o) => {
              const on = o.value === picked;
              return (
                <Pressable
                  key={String(o.value)}
                  onPress={() => setPicked(o.value)}
                  style={[styles.option, on && styles.optionOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  <Txt weight={on ? 'semibold' : 'regular'} color={on ? colors.canvas : colors.muted} align="center">
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
            <Button label="선택" onPress={() => onSelect(picked)} style={styles.confirm} />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.dim, justifyContent: 'flex-end' },
  sheet: {
    ...appColumn,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginVertical: spacing.sm },
  title: { marginVertical: spacing.md },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  optionOn: { backgroundColor: colors.inkSoft, borderRadius: radius.xs },
  confirm: { marginTop: spacing.lg },
});
