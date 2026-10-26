import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { deadlineLine } from '../../rsvp/rsvp';
import { RsvpSettings } from '../model';
import { IText, Page, PageTitle, useLook } from './look';
import type { RsvpHandlers } from './PageContent';

/**
 * 참석 신청 장 — 장 안에는 버튼만 두고 입력은 모달에서 받는다
 * (스토리형에서 입력칸을 누르다 장이 넘어가지 않게)
 */
export function RsvpPage({
  settings,
  title,
  cta,
  rsvp,
}: {
  settings: RsvpSettings;
  /** 기업 '참석 신청' / 모임 '참석 여부' */
  title: string;
  /** 첫 버튼 문구 */
  cta: string;
  rsvp?: RsvpHandlers;
}) {
  const look = useLook();
  const deadline = settings.deadline;
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
      <PageTitle>{title}</PageTitle>
      {!!deadline && (
        <IText tone="sub" raw>
          {deadlineLine(deadline)}
        </IText>
      )}
      {!rsvp ? (
        <>
          {button(cta)}
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
        button(cta, rsvp.loading ? undefined : rsvp.onOpen)
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
