import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { findNotice } from '../../../data/notices';
import { formatDate } from '../../../lib/format';
import { colors, spacing } from '../../../theme';

/** 공지사항 상세: 제목 / 작성일 / 내용 */
export default function NoticeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = findNotice(id);
  return (
    <Screen header={<Header title="공지사항 상세" />} contentStyle={styles.content}>
      {!notice ? (
        <Txt color={colors.muted}>공지사항을 찾을 수 없어요.</Txt>
      ) : (
        <>
          <Txt variant="title">{notice.title}</Txt>
          <Txt variant="caption" color={colors.muted}>
            {formatDate(notice.date)}
          </Txt>
          <View style={styles.divider} />
          <Txt>{notice.body}</Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm },
});
