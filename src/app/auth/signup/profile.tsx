import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { SegmentedTabs } from '../../../components/SegmentedTabs';
import { FieldMessage, TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { useCompleteSignup } from '../../../features/auth/useCompleteSignup';
import { useSignupGuard } from '../../../features/auth/useSignupGuard';
import { formatBirthInput, isValidBirth } from '../../../lib/format';
import { isValidName, isValidPhone } from '../../../lib/validators';
import { Gender } from '../../../services';
import { useSignupDraft } from '../../../store/signupDraft';
import { colors, spacing } from '../../../theme';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'none', label: '선택안함' },
];

export default function SignupProfile() {
  const draft = useSignupGuard();
  const patch = useSignupDraft((s) => s.patch);
  const { submit, submitting, error } = useCompleteSignup();
  const [name, setName] = useState(draft.name ?? '');
  const [birth, setBirth] = useState(draft.birth ?? '');
  const [gender, setGender] = useState<Gender>(draft.gender ?? 'none');
  const [phone, setPhone] = useState(draft.phone ?? '');

  const nameMsg: FieldMessage =
    name && !isValidName(name) ? { type: 'error', text: '한글, 영문, 숫자만 20자 이내로 입력해 주세요.' } : null;
  const birthMsg: FieldMessage =
    birth.length === 10 && !isValidBirth(birth) ? { type: 'error', text: '올바른 날짜를 입력해 주세요.' } : null;
  const phoneMsg: FieldMessage =
    phone && !isValidPhone(phone) ? { type: 'error', text: '숫자만 10~11자리로 입력해 주세요.' } : null;

  const valid =
    isValidName(name) && (!birth || isValidBirth(birth)) && (!phone || isValidPhone(phone));
  const isSocial = draft.provider !== 'email';

  const next = () => {
    const values = { name, birth: birth || undefined, gender, phone: phone || undefined };
    patch(values);
    if (isSocial) submit({ ...draft, ...values });
    else router.push('/auth/signup/email');
  };

  return (
    <Screen
      header={<Header title="회원가입 정보 입력" />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          {error && (
            <Txt variant="caption" color={colors.danger} align="center">
              {error}
            </Txt>
          )}
          <Button label={isSocial ? '가입 완료' : '다음'} disabled={!valid} loading={submitting} onPress={next} />
        </BottomCTA>
      }
    >
      <Txt variant="title">회원님에 대한 정보를{'\n'}입력해 주세요.</Txt>
      <Txt variant="caption" color={colors.textMuted} align="right">
        * 필수 입력
      </Txt>
      <TextField
        label="이름(닉네임) *"
        placeholder="한글, 영문, 숫자 입력 가능"
        value={name}
        onChangeText={setName}
        message={nameMsg}
        maxLength={20}
        clearable
      />
      <TextField
        label="생년월일"
        placeholder="1991-01-01"
        value={birth}
        onChangeText={(v) => setBirth(formatBirthInput(v))}
        keyboardType="number-pad"
        message={birthMsg}
        maxLength={10}
      />
      <View style={styles.field}>
        <Txt variant="caption" weight="medium" color={colors.textSub}>
          성별
        </Txt>
        <SegmentedTabs options={GENDERS} value={gender} onChange={setGender} />
      </View>
      <TextField
        label="휴대전화번호"
        placeholder="숫자만 입력 (아이디 찾기에 사용돼요)"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
        keyboardType="phone-pad"
        message={phoneMsg}
        maxLength={11}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
});
