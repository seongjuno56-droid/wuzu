import { Image, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { bornLine, treasureLine } from '../dol';
import { DolContent, formatShortDate } from '../model';
import { AccountRow } from './AccountPage';
import { IText, Page, PageTitle, useLook } from './look';

/** 돌잔치 하객 화면 장 — 아이 프로필·성장 이야기·마음 전하는 곳 (설계 3장) */

/** 오늘의 주인공: 사진·이름·태어난 날·○○·○○의 보물·소개·해시태그 */
export function DolProfilePage({ content }: { content: DolContent }) {
  const { basic, profile } = content;
  const born = bornLine(basic);
  const treasure = treasureLine(basic);
  return (
    <Page>
      <PageTitle>오늘의 주인공</PageTitle>
      {profile.photo && <Image source={{ uri: profile.photo }} style={styles.round} resizeMode="cover" />}
      <IText size={22} bold raw={!!basic.childName.trim()}>
        {basic.childName.trim() || '아이 이름'}
      </IText>
      {!!born && <IText tone="sub">{born}</IText>}
      {!!treasure && (
        <IText tone="sub" raw>
          {treasure}
        </IText>
      )}
      {!!profile.intro.trim() && <IText raw>{profile.intro}</IText>}
      {profile.hashtags.length > 0 && (
        <IText tone="accent" raw>
          {profile.hashtags.map((h) => `#${h}`).join(' ')}
        </IText>
      )}
    </Page>
  );
}

/** 성장 이야기: 왼쪽 세로선 + 점, 날짜·제목·한 줄·사진 */
export function DolTimelinePage({ content }: { content: DolContent }) {
  const look = useLook();
  const items = content.timeline.items;
  return (
    <Page>
      <PageTitle>성장 이야기</PageTitle>
      {!items.length && <IText tone="sub">태어난 날을 넣으면 여기에 이야기가 보여요.</IText>}
      <View style={[styles.timeline, { borderColor: look.sub + '55' }]}>
        {items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: look.accent }]} />
            {!!it.date && (
              <IText size={13} tone="accent" align="left">
                {formatShortDate(it.date)}
              </IText>
            )}
            <IText bold align="left" raw>
              {it.title}
            </IText>
            {!!it.text.trim() && (
              <IText size={14} tone="sub" align="left" raw>
                {it.text}
              </IText>
            )}
            {it.photo && <Image source={{ uri: it.photo }} style={styles.itemPhoto} resizeMode="cover" />}
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 마음 전하는 곳: 안내 문구 + 계좌를 넣은 보호자만 */
export function DolAccountPage({ content }: { content: DolContent }) {
  const rows = content.basic.guardians.flatMap((g) => {
    const a = content.account.accounts[g.id];
    return a && a.bank.trim() && a.number.trim()
      ? [
          {
            label: g.relation,
            rawLabel: true,
            person: { name: g.name, title: g.relation, deceased: false },
            account: a,
          },
        ]
      : [];
  });
  return (
    <Page>
      <PageTitle>마음 전하는 곳</PageTitle>
      {!!content.account.message && (
        <IText tone="sub" raw>
          {content.account.message}
        </IText>
      )}
      <View style={styles.accounts}>
        {rows.map((r, i) => (
          <AccountRow key={`${r.label}-${i}`} row={r} />
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  round: { width: 168, height: 168, borderRadius: 84 },
  timeline: {
    alignSelf: 'stretch',
    gap: spacing.xl,
    borderLeftWidth: 1,
    marginLeft: spacing.sm,
    paddingLeft: spacing.lg,
  },
  item: { gap: 4 },
  dot: { position: 'absolute', left: -spacing.lg - 5, top: 6, width: 9, height: 9, borderRadius: 5 },
  itemPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm, marginTop: spacing.xs },
  accounts: { alignSelf: 'stretch', gap: spacing.sm },
});
