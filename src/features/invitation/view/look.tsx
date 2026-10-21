import { createContext, ReactNode, useContext } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';

import { styleFor, templateFontFamily, TemplateStyle } from '../../../data/templates';
import { translateChildren, useLocale } from '../../../i18n';
import { spacing } from '../../../theme';

/** 템플릿이 정하는 초대장 '룩' (색·서체·표지 구성) */
export interface Look extends TemplateStyle {
  regular: string;
  bold: string;
}

export function lookFor(themeId: string, templateId: string): Look {
  const style = styleFor(themeId, templateId);
  const [regular, bold] = templateFontFamily[style.font];
  return { ...style, regular, bold };
}

const LookContext = createContext<Look>(lookFor('', ''));
export const LookProvider = ({ look, children }: { look: Look; children: ReactNode }) => (
  <LookContext.Provider value={look}>{children}</LookContext.Provider>
);
export const useLook = () => useContext(LookContext);

interface ITextProps {
  children: ReactNode;
  size?: number;
  bold?: boolean;
  tone?: 'fg' | 'sub' | 'accent';
  align?: TextStyle['textAlign'];
  style?: TextStyle;
  numberOfLines?: number;
  /** 사용자가 쓴 글(인사말·방명록·예식장 등) — 번역하지 않는다 */
  raw?: boolean;
}

/** 초대장 본문 텍스트 — 템플릿 서체·색을 따른다 */
export function IText({ children, size = 15, bold, tone = 'fg', align = 'center', style, numberOfLines, raw }: ITextProps) {
  const look = useLook();
  const locale = useLocale((s) => s.locale);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: bold ? look.bold : look.regular,
          fontSize: size,
          lineHeight: Math.round(size * 1.75),
          color: look[tone],
          textAlign: align,
        },
        style,
      ]}
    >
      {raw ? children : translateChildren(children, locale)}
    </Text>
  );
}

/** 페이지 한 칸: 위아래 넉넉한 여백 + 가운데 정렬 */
export function Page({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.page, style]}>{children}</View>;
}

/** 페이지 제목 (예식 장소, 마음 전하실 곳, 방명록 …) */
export function PageTitle({ children }: { children: ReactNode }) {
  const look = useLook();
  return (
    <View style={styles.titleWrap}>
      <View style={[styles.rule, { backgroundColor: look.accent }]} />
      <IText size={19} bold>
        {children}
      </IText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: 56, paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.lg },
  titleWrap: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  rule: { width: 24, height: 1 },
});
