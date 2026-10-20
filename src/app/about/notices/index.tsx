import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { SelectSheet } from '../../../components/SelectSheet';
import { Txt } from '../../../components/Txt';
import { NOTICE_CATEGORY_LABEL, NoticeCategory, noticeList } from '../../../data/notices';
import { formatDate } from '../../../lib/format';
import { colors, radius, spacing } from '../../../theme';

const OPTIONS: { value: NoticeCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  ...(Object.keys(NOTICE_CATEGORY_LABEL) as NoticeCategory[]).map((c) => ({ value: c, label: NOTICE_CATEGORY_LABEL[c] })),
];

/** 공지사항: 구분 필터 + 목록(제목·작성일) */
export default function NoticesScreen() {
  const [filter, setFilter] = useState<NoticeCategory | 'all'>('all');
  const [open, setOpen] = useState(false);
  const list = noticeList().filter((n) => filter === 'all' || n.category === filter);

  return (
    <Screen header={<Header title="공지사항" />} contentStyle={styles.content}>
      <Pressable onPress={() => setOpen(true)} style={styles.filter} accessibilityRole="button">
        <Txt variant="caption" color={colors.label}>
          {OPTIONS.find((o) => o.value === filter)!.label}
        </Txt>
        <Ionicons name="caret-down" size={12} color={colors.label} />
      </Pressable>
      {list.length === 0 ? (
        <Txt color={colors.muted} align="center" style={styles.empty}>
          등록된 공지사항이 없습니다.
        </Txt>
      ) : (
        list.map((n) => (
          <Pressable key={n.id} onPress={() => router.push(`/about/notices/${n.id}`)} style={styles.item} accessibilityRole="button">
            <Txt variant="subtitle" weight="semibold">
              [{NOTICE_CATEGORY_LABEL[n.category]}] {n.title}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              {formatDate(n.date)}
            </Txt>
          </Pressable>
        ))
      )}
      <SelectSheet<NoticeCategory | 'all'>
        visible={open}
        title="구분"
        options={OPTIONS}
        value={filter}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          setFilter(v);
          setOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl },
  filter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xs,
    marginBottom: spacing.md,
  },
  item: { paddingVertical: spacing.lg, gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.inkSoft },
  empty: { paddingVertical: 80 },
});
