import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { CorporateContent, formatShortDate } from '../model';
import { IText, Page, PageTitle, useLook } from './look';
import type { RsvpHandlers } from './PageContent';

/**
 * 참석 신청 장 — 장 안에는 버튼만 두고 입력은 모달에서 받는다
 * (스토리형에서 입력칸을 누르다 장이 넘어가지 않게)
 */
export function RsvpPage({ content, rsvp }: { content: CorporateContent; rsvp?: RsvpHandlers }) {
  const look = useLook();
  const deadline = content.rsvp.deadline;
  const button = (label: string, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      style={[styles.button, { backgroundColor: onPress ? look.accent : look.sub + '55' }]}
    >
      <IText bold style={styles.buttonText}>
        {label}
      </IText>
    </Pressable>
  );
  return (
    <Page>
      <PageTitle>참석 신청</PageTitle>
      {!!deadline && <IText tone="sub">{`${formatShortDate(deadline)}까지 알려 주세요.`}</IText>}
      {!rsvp ? (
        <>
          {button('참석 신청하기')}
          <IText size={13} tone="sub">
            초대장을 활성화하면 하객이 신청할 수 있어요.
          </IText>
        </>
      ) : rsvp.mine ? (
        <View style={[styles.done, { borderColor: look.sub + '44' }]}>
          <IText bold>응답을 보냈어요</IText>
          <IText tone="sub" raw>
            {rsvp.mine.name}
          </IText>
          <IText tone="accent">{rsvp.mine.attending ? '참석' : '불참'}</IText>
          {rsvp.closed ? (
            <IText size={13} tone="sub">
              마감되었어요
            </IText>
          ) : (
            button('응답 고치기', rsvp.onOpen)
          )}
        </View>
      ) : rsvp.closed ? (
        <IText tone="sub">마감되었어요</IText>
      ) : (
        button('참석 신청하기', rsvp.onOpen)
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  buttonText: { color: '#fff' },
  done: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
});
