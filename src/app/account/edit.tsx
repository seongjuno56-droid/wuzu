import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { OptionGroup } from '../../components/OptionGroup';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { AccountEditInput, displayLoginId, toAccountValues, validateAccountEdit } from '../../features/account/rules';
import { Check } from '../../features/invitation/editor/fields';
import { formatBirthInput } from '../../lib/format';
import { authService, Gender } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';

/**
 * 회원정보 수정: 닉네임*(2~10) / 생년월일·성별(사용 체크 시 필수).
 * 생년월일은 온보딩과 같은 숫자 입력(자동 하이픈) — 편집기 달력은 오늘 이전 날짜를 막아서 쓰지 않는다.
 */
export default function AccountEditScreen() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const [form, setForm] = useState<AccountEditInput>(() => ({
    name: user?.name ?? '',
    birth: user?.birth ?? '',
    useBirth: !!user?.birth,
    gender: user?.gender && user.gender !== 'none' ? user.gender : '',
    useGender: !!user?.gender && user.gender !== 'none',
  }));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!user) return <Redirect href="/auth/login" />;

  const errors = validateAccountEdit(form);
  const set = (patch: Partial<AccountEditInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    setTouched(true);
    if (errors.length || saving) return;
    setSaving(true);
    try {
      setUser(await authService.updateAccount(user.id, toAccountValues(form)));
      toast('수정이 완료되었습니다.');
      router.back();
    } catch {
      toast('수정하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const err = (k: 'name' | 'birth' | 'gender', text: string) =>
    touched && errors.includes(k) ? { type: 'error' as const, text } : null;

  return (
    <Screen header={<Header title="회원정보 수정" />} contentStyle={styles.content}>
      <View style={styles.field}>
        <Txt weight="semibold">아이디</Txt>
        <Txt color={colors.muted}>{displayLoginId(user)}</Txt>
      </View>
      <TextField
        label="닉네임"
        required
        value={form.name}
        onChangeText={(name) => set({ name })}
        maxLength={10}
        message={err('name', '한글, 영어, 숫자 2~10자로 입력해 주세요.')}
      />
      <View style={styles.field}>
        <Txt weight="semibold">생년월일</Txt>
        <View style={styles.row}>
          <View style={[styles.flex, !form.useBirth && styles.off]} pointerEvents={form.useBirth ? 'auto' : 'none'}>
            <TextField
              placeholder="1991-01-01"
              value={form.birth}
              onChangeText={(v) => set({ birth: formatBirthInput(v) })}
              keyboardType="number-pad"
              maxLength={10}
              message={err('birth', '올바른 생년월일을 입력해 주세요.')}
            />
          </View>
          <Check label="사용" value={form.useBirth} onChange={(useBirth) => set({ useBirth })} />
        </View>
      </View>
      <View style={styles.field}>
        <Txt weight="semibold">성별</Txt>
        <View style={styles.row}>
          <View style={[styles.flex, !form.useGender && styles.off]} pointerEvents={form.useGender ? 'auto' : 'none'}>
            <OptionGroup<Gender | ''>
              value={form.gender}
              onChange={(gender) => set({ gender })}
              options={[
                { value: 'male', label: '남성' },
                { value: 'female', label: '여성' },
              ]}
            />
          </View>
          <Check label="사용" value={form.useGender} onChange={(useGender) => set({ useGender })} />
        </View>
        {touched && errors.includes('gender') && (
          <Txt variant="caption" color={colors.danger}>
            성별을 선택해 주세요.
          </Txt>
        )}
      </View>
      <View style={styles.row}>
        <Button label="이전" variant="outline" onPress={() => router.back()} style={styles.flex} />
        <Button label={saving ? '저장 중…' : '회원정보 수정'} onPress={submit} style={styles.flex} />
      </View>
      <Pressable onPress={() => router.push('/account/withdraw')} style={styles.withdraw} accessibilityRole="button">
        <Txt variant="caption" color={colors.muted} style={styles.underline}>
          회원탈퇴
        </Txt>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  field: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  off: { opacity: 0.4 },
  withdraw: { alignSelf: 'center', padding: spacing.sm },
  underline: { textDecorationLine: 'underline' },
});
