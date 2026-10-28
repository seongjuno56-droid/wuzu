import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Check } from '../../features/invitation/editor/fields';
import { formatBirthInput, isValidBirth } from '../../lib/format';
import { authService, Gender } from '../../services';
import { useSession } from '../../store/session';
import { colors, spacing } from '../../theme';
import { AppModal } from '../AppModal';
import { OptionGroup } from '../OptionGroup';
import { TextField } from '../TextField';
import { Txt } from '../Txt';

/**
 * 간편 로그인 후 최초 회원정보 기입 — 세 항목 모두 선택값이라 유효성 검사 없이 저장한다.
 * 다음에 하기: 생년월일·성별 비움(-), 마케팅 미동의
 */
export function OnboardingModal({ visible }: { visible: boolean }) {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const setNeedsOnboarding = useSession((s) => s.setNeedsOnboarding);
  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (values: { birth?: string; gender?: Gender; marketingAgreed: boolean }) => {
    if (!user) return;
    setSaving(true);
    try {
      setUser(await authService.updateProfile(user.id, values));
    } finally {
      setSaving(false);
      setNeedsOnboarding(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      title={'WUZU에 오신 것을 환영합니다.\n아래 정보를 입력해 주세요.'}
      actions={[
        { label: '다음에 하기', variant: 'outline', onPress: () => save({ marketingAgreed: false }) },
        {
          label: saving ? '저장 중…' : '확인',
          onPress: () =>
            save({
              birth: isValidBirth(birth) ? birth : undefined,
              gender: gender || undefined,
              marketingAgreed: marketing,
            }),
        },
      ]}
    >
      <View style={styles.form}>
        <TextField
          label="생년월일"
          placeholder="1991-01-01"
          value={birth}
          onChangeText={(v) => setBirth(formatBirthInput(v))}
          keyboardType="number-pad"
          maxLength={10}
        />
        <View style={styles.field}>
          <Txt variant="caption" weight="semibold" color={colors.label}>
            성별
          </Txt>
          <OptionGroup<Gender | ''>
            value={gender}
            onChange={setGender}
            options={[
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
            ]}
          />
        </View>
        <Check label="마케팅 정보 수신에 동의합니다." value={marketing} onChange={setMarketing} />
        <Txt variant="tiny" color={colors.faint}>
          모두 선택 항목이에요. 나중에 바꿀 수 있어요.
        </Txt>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.sm },
  field: { gap: spacing.sm },
});
