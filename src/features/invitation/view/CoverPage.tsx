import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme';
import { formatKoreanTime, InvitationContent, parseDate, WEEKDAYS_EN, WEEKDAYS_KO } from '../model';
import { IText, useLook } from './look';

/** 표지: 템플릿의 cover 구성(date / names / frame)에 따라 배치 */
export function CoverPage({ content }: { content: InvitationContent }) {
  const look = useLook();
  const { groom, bride } = content.basic;
  const d = parseDate(content.ceremony.date);
  const names = `${groom.name || '신랑'} ♥ ${bride.name || '신부'}`;
  const dateLabel = `${d.getFullYear()} / ${d.getMonth() + 1} / ${d.getDate()}`;
  const datetime = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS_KO[d.getDay()]}요일, ${formatKoreanTime(content.ceremony.time)}`;

  return (
    <View style={[styles.cover, look.cover === 'frame' && [styles.frame, { borderColor: look.accent }]]}>
      {look.cover === 'names' ? (
        <>
          <IText size={12} tone="accent" style={{ letterSpacing: 4 }}>
            WEDDING INVITATION
          </IText>
          <IText size={28} bold>
            {names}
          </IText>
          <View style={[styles.rule, { backgroundColor: look.accent }]} />
          <IText size={14} tone="sub">
            {datetime}
          </IText>
        </>
      ) : (
        <>
          <IText size={32} bold style={{ letterSpacing: 1 }}>
            {dateLabel}
          </IText>
          <IText size={14} tone="sub">
            {WEEKDAYS_EN[d.getDay()]}
          </IText>
          <Ionicons name="heart" size={14} color={look.accent} />
          <IText size={18} bold>
            {names}
          </IText>
          <IText size={14} tone="sub">
            {datetime}
          </IText>
          {!!content.ceremony.venue && (
            <IText size={14} tone="sub">
              {content.ceremony.venue}
            </IText>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', gap: spacing.md, paddingVertical: 96, paddingHorizontal: spacing.xl },
  frame: { borderWidth: 1, margin: spacing.xl, paddingVertical: 72 },
  rule: { width: 32, height: 1, marginVertical: spacing.sm },
});
