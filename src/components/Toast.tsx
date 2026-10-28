import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { colors, radius, spacing } from '../theme';
import { Txt } from './Txt';

const SHOW_MS = 2200;

interface ToastState {
  message: string | null;
  seq: number;
  show: (message: string) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>()((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((s) => ({ message, seq: s.seq + 1 })),
  hide: () => set({ message: null }),
}));

/** 어디서든 짧은 안내 띄우기: toast('복사되었습니다.') */
export const toast = (message: string) => useToastStore.getState().show(message);

/** 루트 레이아웃에 한 번 둔다 */
export function ToastHost() {
  const { message, seq, hide } = useToastStore();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(t);
  }, [message, seq, hide]);

  if (!message) return null;
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.toast}>
        <Txt variant="caption" color={colors.canvas} align="center">
          {message}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', paddingHorizontal: spacing.xl },
  toast: {
    backgroundColor: 'rgba(17,17,17,0.9)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 360,
  },
});
