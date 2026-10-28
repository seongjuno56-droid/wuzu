import { Pressable, StyleSheet, View } from 'react-native';

import type { GuestbookEntry } from '../../../services/types';
import { radius, spacing } from '../../../theme';
import { GuestbookSettings } from '../model';
import { IText, Page, PageTitle, useLook } from './look';

const PREVIEW_COUNT = 2;

interface Props {
  settings: GuestbookSettings;
  entries: GuestbookEntry[];
  onWrite?: () => void;
  onViewAll?: () => void;
}

export function GuestbookPage({ settings, entries, onWrite, onViewAll }: Props) {
  const look = useLook();
  const shown = entries.slice(0, PREVIEW_COUNT);
  const boxed = settings.style === 1;

  return (
    <Page>
      <PageTitle>방명록</PageTitle>
      <View style={styles.list}>
        {shown.length === 0 && (
          <IText size={14} tone="sub">
            첫 번째 축하 메시지를 남겨주세요.
          </IText>
        )}
        {shown.map((e, i) => (
          <View
            key={e.id}
            style={
              boxed
                ? [styles.card, { borderColor: look.sub + '55' }]
                : [styles.line, i > 0 && { borderTopColor: look.sub + '33', borderTopWidth: 1 }]
            }
          >
            <IText size={12} tone="sub" align="left" raw>
              - {e.name} -
            </IText>
            <IText size={14} align="left" numberOfLines={2} raw>
              {e.content}
            </IText>
          </View>
        ))}
      </View>
      <View style={styles.links}>
        <Pressable onPress={onWrite} hitSlop={8} accessibilityRole="button">
          <IText size={14} style={styles.link}>
            작성하기
          </IText>
        </Pressable>
        <IText size={14} tone="sub">
          |
        </IText>
        <Pressable onPress={onViewAll} hitSlop={8} accessibilityRole="button">
          <IText size={14} style={styles.link}>
            전체보기
          </IText>
        </Pressable>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  line: { paddingVertical: spacing.md },
  links: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'flex-end' },
  link: { textDecorationLine: 'underline' },
});
