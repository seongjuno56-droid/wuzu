import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextStyle, View } from 'react-native';

import { InviteTemplate, SAMPLE_CONTENT, templateFontFamily } from '../data/templates';
import { fonts, spacing } from '../theme';

interface Props {
  template: InviteTemplate;
  /** true면 표지만 그린다 (템플릿 선택 카드용) */
  coverOnly?: boolean;
}

export function TemplatePreview({ template, coverOnly }: Props) {
  const { style } = template;
  const c = SAMPLE_CONTENT[template.themeId];
  const family = templateFontFamily[style.font];
  const t = (size: number, color: string, weight: 'regular' | 'bold' = 'regular', extra?: TextStyle): TextStyle => ({
    fontSize: size,
    lineHeight: Math.round(size * 1.6),
    color,
    textAlign: 'center',
    fontFamily: family ?? (weight === 'bold' ? fonts.bold : fonts.regular),
    fontWeight: family && weight === 'bold' ? '700' : undefined,
    ...extra,
  });

  const cover = (
    <View style={[styles.cover, style.cover === 'frame' && { borderColor: style.accent, ...styles.frame }]}>
      {style.cover === 'names' ? (
        <>
          <Text style={t(12, style.accent, 'regular', { letterSpacing: 4 })}>INVITATION</Text>
          <Text style={t(26, style.fg, 'bold')}>{c.hosts}</Text>
          <View style={[styles.rule, { backgroundColor: style.accent }]} />
          <Text style={t(14, style.sub)}>{c.datetime}</Text>
        </>
      ) : (
        <>
          <Text style={t(30, style.fg, 'bold', { letterSpacing: 1 })}>{c.dateLabel}</Text>
          <Text style={t(14, style.sub)}>{c.weekday}</Text>
          <Ionicons name="heart" size={14} color={style.accent} style={styles.icon} />
          <Text style={t(17, style.fg, 'bold')}>{c.hosts}</Text>
          <Text style={t(14, style.sub)}>{c.datetime}</Text>
        </>
      )}
    </View>
  );

  if (coverOnly) return <View style={[styles.fill, { backgroundColor: style.bg }]}>{cover}</View>;

  return (
    <View style={{ backgroundColor: style.bg }}>
      <SectionTag label="#표지" color={style.sub} />
      {cover}
      <SectionTag label="#인사말" color={style.sub} />
      <View style={styles.section}>
        <Text style={t(20, style.fg, 'bold')}>{c.greetingTitle}</Text>
        <Text style={t(15, style.fg, 'regular', { lineHeight: 30 })}>{c.greeting}</Text>
        {c.family?.map((line) => (
          <Text key={line} style={t(15, style.sub)}>
            {line}
          </Text>
        ))}
      </View>
      <SectionTag label={`#${c.infoTitle}`} color={style.sub} />
      <View style={[styles.section, styles.last]}>
        <Text style={t(26, style.fg, 'bold')}>{c.dateLabel}</Text>
        <View style={[styles.rule, { backgroundColor: style.accent }]} />
        {c.infoLines.map((line) => (
          <Text key={line} style={t(15, style.fg)}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SectionTag({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.tag, { color }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center' },
  cover: { alignItems: 'center', gap: spacing.md, paddingVertical: 64, paddingHorizontal: spacing.xl },
  frame: { borderWidth: 1, margin: spacing.xl, paddingVertical: 48 },
  icon: { marginVertical: spacing.xs },
  rule: { width: 32, height: 1, marginVertical: spacing.sm },
  section: { alignItems: 'center', gap: spacing.lg, paddingVertical: 48, paddingHorizontal: spacing.xl },
  last: { paddingBottom: 80 },
  tag: { fontSize: 11, fontFamily: fonts.regular, paddingHorizontal: spacing.md, paddingTop: spacing.sm, opacity: 0.6 },
});
