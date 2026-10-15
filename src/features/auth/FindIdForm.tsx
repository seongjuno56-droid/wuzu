import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { BottomCTA } from '../../components/BottomCTA';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { formatBirthInput, isValidBirth } from '../../lib/format';
import { isValidName, isValidPhone, maskEmail } from '../../lib/validators';
import { authService } from '../../services';
import { spacing } from '../../theme';

export function FindIdForm() {
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const valid = isValidName(name) && isValidBirth(birth) && isValidPhone(phone);

  const submit = async () => {
    setLoading(true);
    try {
      const found = await authService.findId({ name, birth, phone });
      if (!found) {
        setNotFound(true);
        return;
      }
      // URL에 전체 이메일이 남지 않도록 마스킹된 값만 넘긴다
      router.push({
        pathname: '/auth/find-id-result',
        params: { maskedEmail: maskEmail(found.email), createdAt: found.createdAt },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.form}>
        <TextField label="닉네임" placeholder="한글, 영문, 숫자 입력 가능" value={name} onChangeText={setName} clearable />
        <TextField
          label="생년월일"
          placeholder="1991-01-01"
          value={birth}
          onChangeText={(v) => setBirth(formatBirthInput(v))}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextField
          label="휴대전화번호"
          placeholder="숫자만 입력"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
          keyboardType="phone-pad"
          maxLength={11}
        />
      </View>
      <BottomCTA>
        <Button label="아이디 찾기" disabled={!valid} loading={loading} onPress={submit} />
      </BottomCTA>
      <AppModal
        visible={notFound}
        message={'입력한 정보와 일치한\n아이디가 존재하지 않습니다.'}
        onDismiss={() => setNotFound(false)}
        actions={[{ label: '확인', onPress: () => setNotFound(false) }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, padding: spacing.xl, gap: spacing.lg },
});
