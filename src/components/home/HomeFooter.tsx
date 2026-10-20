import { Ionicons } from '@expo/vector-icons';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BUSINESS_INFO } from '../../config';
import { colors, radius, spacing } from '../../theme';
import { Button } from '../Button';
import { Txt } from '../Txt';

const LINKS = ['이용약관', '유료 이용약관', '개인정보 처리방침', '구매 복원'];

interface Props {
  loggedIn: boolean;
  onAuthPress: () => void;
  onLinkPress: (label: string) => void;
  /** 로그인/로그아웃 칩 표시 (마이페이지는 메뉴 줄에 로그아웃이 있어 숨긴다) */
  showAuth?: boolean;
}

/** 푸터: 24px 칩 + '사업자 정보' 토글 */
export function HomeFooter({ loggedIn, onAuthPress, onLinkPress, showAuth = true }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showAuth && <Button variant="chip" label={loggedIn ? '로그아웃' : '로그인'} onPress={onAuthPress} />}
        <Pressable
          style={styles.toggle}
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Txt variant="tiny" color={colors.label}>
            사업자 정보
          </Txt>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.label} />
        </Pressable>
      </View>
      {open && (
        <Txt variant="tiny" color={colors.faint}>
          상호 {BUSINESS_INFO.company} | 대표 {BUSINESS_INFO.ceo}
          {'\n'}사업자등록번호 {BUSINESS_INFO.registrationNo}
          {'\n'}
          {BUSINESS_INFO.address}
        </Txt>
      )}
      <View style={styles.links}>
        {LINKS.map((l, i) => (
          <Fragment key={l}>
            {i > 0 && <View style={styles.sep} />}
            <Pressable onPress={() => onLinkPress(l)} hitSlop={6}>
              <Txt variant="tiny" weight={l === '개인정보 처리방침' ? 'semibold' : 'regular'} color={colors.muted}>
                {l}
              </Txt>
            </Pressable>
          </Fragment>
        ))}
      </View>
      <Txt variant="tiny" color={colors.faint}>
        © 2026 {BUSINESS_INFO.company}. All rights reserved.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggle: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  sep: { width: 1, height: 10, backgroundColor: colors.hairline },
});
