import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { CheckRow } from '../../../components/CheckRow';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { TERMS_PRIVACY, TERMS_SERVICE } from '../../../data/terms';
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
      header={<Header title="약관 동의" />}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="다음" disabled={!(service && privacy)} onPress={next} />
        </BottomCTA>
      }
    >
      <CheckRow checked={service} onToggle={() => setService(!service)} label="[필수] 서비스 이용약관 동의">
        <ScrollView style={styles.terms} nestedScrollEnabled>
          <Txt variant="caption" color={colors.textSub}>
            {TERMS_SERVICE}
          </Txt>
        </ScrollView>
      </CheckRow>
      <CheckRow checked={privacy} onToggle={() => setPrivacy(!privacy)} label="[필수] 개인정보 처리방침">
        <ScrollView style={styles.terms} nestedScrollEnabled>
          <Txt variant="caption" color={colors.textSub}>
            {TERMS_PRIVACY}
          </Txt>
        </ScrollView>
      </CheckRow>
      <CheckRow checked={marketing} onToggle={() => setMarketing(!marketing)} label="[선택] 프로모션 정보 수신 동의" />
      <CheckRow checked={all} onToggle={toggleAll} label="모두 동의합니다." emphasized />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.md },
  terms: { maxHeight: 150 },
});
