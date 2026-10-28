import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Locale, LOCALES, useLocale } from '../i18n';
import { colors, spacing } from '../theme';
import { SelectSheet } from './SelectSheet';
import { Txt } from './Txt';

/** 언어 선택 (🌐 KO / EN) — 로그인 전에도 바꿀 수 있게 홈 상단·앱 설정에 둔다 */
export function LanguageButton({ variant = 'icon' }: { variant?: 'icon' | 'row' }) {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const label = LOCALES.find((l) => l.value === locale)?.label ?? locale;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={variant === 'row' ? styles.row : styles.icon}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${label}`}
      >
        {variant === 'row' ? (
          <>
            <Txt variant="subtitle" style={styles.flex}>
              Language / 언어
            </Txt>
            <Txt color={colors.muted}>{label}</Txt>
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </>
        ) : (
          <>
            <Ionicons name="globe-outline" size={22} color={colors.inkSoft} />
            <Txt variant="tiny" weight="semibold" color={colors.inkSoft}>
              {locale.toUpperCase()}
            </Txt>
          </>
        )}
      </Pressable>
      <SelectSheet<Locale>
        visible={open}
        title="Language / 언어"
        options={LOCALES}
        value={locale}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          setLocale(v);
          setOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  icon: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
});
