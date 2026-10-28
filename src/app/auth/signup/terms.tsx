import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { CheckRow } from '../../../components/CheckRow';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { TERMS_PRIVACY, TERMS_SERVICE } from '../../../data/terms';
import { SignupStepHeader } from '../../../features/auth/SignupStepHeader';
import { useSignupGuard } from '../../../features/auth/useSignupGuard';
import { useSignupDraft } from '../../../store/signupDraft';
import { colors, spacing } from '../../../theme';

export default function SignupTerms() {
  const draft = useSignupGuard();
  const patch = useSignupDraft((s) => s.patch);
  const [service, setService] = useState(!!draft.termsService);
  const [privacy, setPrivacy] = useState(!!draft.termsPrivacy);
  const [marketing, setMarketing] = useState(!!draft.marketingAgreed);

  const all = service && privacy && marketing;
  const toggleAll = () => {
    const next = !all;
    setService(next);
    setPrivacy(next);
    setMarketing(next);
  };

  const next = () => {
    patch({ termsService: service, termsPrivacy: privacy, marketingAgreed: marketing });
    router.push('/auth/signup/profile');
  };

  return (
    <Screen
      header={<SignupStepHeader step="terms" title={'서비스 이용을 위해\n약관에 동의해 주세요'} />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="다음" disabled={!(service && privacy)} onPress={next} />
        </BottomCTA>
      }
    >
      <CheckRow checked={all} onToggle={toggleAll} label="약관 전체 동의" emphasized />
      <View style={styles.items}>
        <CheckRow checked={service} onToggle={() => setService(!service)} tag="필수" label="서비스 이용약관 동의">
          <ScrollView style={styles.terms} nestedScrollEnabled>
            <Txt variant="tiny" color={colors.muted}>
              {TERMS_SERVICE}
            </Txt>
          </ScrollView>
        </CheckRow>
        <CheckRow checked={privacy} onToggle={() => setPrivacy(!privacy)} tag="필수" label="개인정보 처리방침 동의">
          <ScrollView style={styles.terms} nestedScrollEnabled>
            <Txt variant="tiny" color={colors.muted}>
              {TERMS_PRIVACY}
            </Txt>
          </ScrollView>
        </CheckRow>
        <CheckRow
          checked={marketing}
          onToggle={() => setMarketing(!marketing)}
          tag="선택"
          label="프로모션 정보 수신 동의"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  items: { gap: 0 },
  terms: { maxHeight: 120 },
});
