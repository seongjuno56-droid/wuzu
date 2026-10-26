import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { MeetupContent } from '../model';
import { AccountRow } from './AccountPage';
import { IText, Page, PageTitle, useLook } from './look';

/** 모임 하객 화면 장 — 안내사항·회비 계좌 (설계 5장). 일정표·참석 여부는 기업 장을 같이 쓴다 */

/** 안내사항: 제목·내용 카드 */
export function NoticesPage({ content }: { content: MeetupContent }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>안내사항</PageTitle>
      <View style={styles.cards}>
        {content.notices.items.map((n) => (
          <View key={n.id} style={[styles.card, { borderColor: look.sub + '33' }]}>
            <IText bold align="left" raw>
              {n.title}
            </IText>
            {!!n.text.trim() && (
              <IText size={14} tone="sub" align="left" raw>
                {n.text}
              </IText>
            )}
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 회비 계좌: 금액 + 계좌(은행·번호·예금주가 다 있을 때만) */
export function MeetupAccountPage({ content }: { content: MeetupContent }) {
  const a = content.account;
  const full = !!a.bank.trim() && !!a.number.trim() && !!a.holder.trim();
  return (
    <Page>
      <PageTitle>회비 계좌</PageTitle>
      {!!a.amount.trim() && (
        <IText size={20} bold raw>
          {a.amount}
        </IText>
      )}
      {full && (
        <View style={styles.cards}>
          <AccountRow
            row={{
              label: '예금주',
              person: { name: a.holder.trim(), title: '', deceased: false },
              account: { bank: a.bank.trim(), number: a.number.trim() },
            }}
          />
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  cards: { alignSelf: 'stretch', gap: spacing.md },
  card: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderRadius: radius.sm },
});
