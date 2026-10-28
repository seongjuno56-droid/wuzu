import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { signOut } from '../../features/auth/signOut';
import { Check } from '../../features/invitation/editor/fields';
import { authService } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

const WITHIN = [
  '탈퇴 신청 후 30일 이내에는 탈퇴신청을 철회 할 수 있습니다.',
  '회원탈퇴 철회는 가입한 채널로 로그인 시 확인 가능합니다.',
  '탈퇴를 진행하는 30일 동안 동일한 채널을 통한 가입은 불가합니다.',
];
const AFTER = [
  '탈퇴 신청으로부터 30일이 초과된 시점부터는 계정을 복구하실 수 없습니다.',
  '내가 만든 초대장, 각종 유료 상품, 각종 컨텐츠 등 회원 개인이 가진 권리는 모두 소멸됩니다.',
  '구매했던 모든 상품의 환불 처리가 불가하오니 필요한 경우 탈퇴 전에 반드시 환불 처리를 해주시기 바랍니다.',
  '탈퇴 후 커뮤니티 등 서비스 내에 작성한 게시물과 댓글은 삭제 처리가 불가합니다.',
];

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Ionicons name="information-circle-outline" size={18} color={colors.inkSoft} />
        <Txt weight="semibold">{title}</Txt>
      </View>
      {items.map((t) => (
        <Txt key={t} color={colors.label}>
          • {t}
        </Txt>
      ))}
    </View>
  );
}

/** 회원탈퇴: 안내 확인 체크 → 탈퇴 신청 → 로그아웃 → 완료 화면 */
export default function WithdrawScreen() {
  const user = useSession((s) => s.user);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return <Redirect href="/auth/login" />;

  const withdraw = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    try {
      await authService.requestWithdraw(user.id);
      // 탈퇴 신청한 세션은 끊는다 (철회는 30일 안에 다시 로그인하면 보인다)
      await signOut();
      router.replace('/account/withdrawn');
    } catch {
      toast('탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title="회원탈퇴" />} contentStyle={styles.content}>
      <Txt variant="title">정말 회원 탈퇴를 하시겠습니까?</Txt>
      <Block title="탈퇴신청 후 30일 이내" items={WITHIN} />
      <Block title="탈퇴신청 후 31일 초과" items={AFTER} />
      <View style={styles.check}>
        <Check label="회원탈퇴 약관을 확인하였습니다." value={agreed} onChange={setAgreed} />
      </View>
      <Button label={busy ? '처리 중…' : '탈퇴하기'} variant="outline" onPress={withdraw} disabled={!agreed || busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  block: { gap: spacing.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  check: { alignItems: 'center', marginTop: spacing.lg },
});
