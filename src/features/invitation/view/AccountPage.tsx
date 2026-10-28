import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, View } from 'react-native';

import { toast } from '../../../components/Toast';
import { useT } from '../../../i18n';
import { spacing } from '../../../theme';
import { AccountInfo, BankAccount, BasicInfo, Person } from '../model';
import { IText, Page, PageTitle, useLook } from './look';

interface Row {
  label: string;
  person: Person;
  account: BankAccount;
  /** 라벨이 사용자 글(돌잔치 보호자 관계)이면 번역하지 않는다 */
  rawLabel?: boolean;
}

export function AccountRow({ row }: { row: Row }) {
  const look = useLook();
  const t = useT();
  // 은행·번호·이름은 사용자 글이라 번역하지 않는다 (고정 라벨만 번역)
  const label = row.rawLabel ? row.label : row.label && t(row.label);
  const copy = async () => {
    await Clipboard.setStringAsync(`${row.account.bank} ${row.account.number}`);
    toast('계좌번호가 복사되었어요.');
  };
  return (
    <View style={[styles.row, { borderColor: look.sub + '33' }]}>
      <View style={styles.flex}>
        <IText size={14} align="left" raw>
          {`${row.account.bank} ${row.account.number}`}
        </IText>
        <IText size={13} tone="sub" align="left" raw>
          {[label, row.person.name].filter(Boolean).join(' ')}
        </IText>
      </View>
      <Pressable onPress={copy} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${row.person.name} 계좌 복사하기`}>
        <IText size={13} style={styles.copy}>
          복사하기
        </IText>
      </Pressable>
    </View>
  );
}

function Side({ title, rows }: { title: string; rows: Row[] }) {
  const filled = rows.filter((r) => r.account.bank && r.account.number);
  if (!filled.length) return null;
  return (
    <View style={styles.side}>
      <IText size={15} bold>
        {title}
      </IText>
      {filled.map((r) => (
        <AccountRow key={r.label} row={r} />
      ))}
    </View>
  );
}

export function AccountPage({ account, basic }: { account: AccountInfo; basic: BasicInfo }) {
  return (
    <Page>
      <PageTitle>마음 전하실 곳</PageTitle>
      {!!account.message && <IText tone="sub" raw>{account.message}</IText>}
      <Side
        title="신랑측"
        rows={[
          { label: '신랑', person: basic.groom, account: account.groom },
          { label: '아버지', person: basic.groomFather, account: account.groomFather },
          { label: '어머니', person: basic.groomMother, account: account.groomMother },
        ]}
      />
      <Side
        title="신부측"
        rows={[
          { label: '신부', person: basic.bride, account: account.bride },
          { label: '아버지', person: basic.brideFather, account: account.brideFather },
          { label: '어머니', person: basic.brideMother, account: account.brideMother },
        ]}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  side: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  copy: { textDecorationLine: 'underline' },
});
