import { StyleSheet, View } from 'react-native';

import { Header } from '../../components/Header';
import { StepIndicator } from '../../components/StepIndicator';
import { Txt } from '../../components/Txt';
import { colors, spacing } from '../../theme';
import { useSignupDraft } from '../../store/signupDraft';

type Step = 'terms' | 'profile' | 'email' | 'password';
const EMAIL_STEPS: Step[] = ['terms', 'profile', 'email', 'password'];
const SOCIAL_STEPS: Step[] = ['terms', 'profile'];

/** 가입 단계 헤더: 상단 바 + 진행 막대 + 큰 제목 */
export function SignupStepHeader({ step, title, description }: { step: Step; title: string; description?: string }) {
  const social = useSignupDraft((s) => s.draft.provider !== 'email');
  const steps = social ? SOCIAL_STEPS : EMAIL_STEPS;
  return (
    <View>
      <Header title="회원가입" divider={false} />
      <StepIndicator total={steps.length} current={steps.indexOf(step) + 1} />
      <View style={styles.titleBox}>
        <Txt variant="headline">{title}</Txt>
        {description && (
          <Txt variant="caption" color={colors.muted}>
            {description}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBox: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.sm, gap: spacing.xs },
});
