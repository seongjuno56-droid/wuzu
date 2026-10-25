import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '../../components/AppModal';
import { TextField } from '../../components/TextField';
import { Txt } from '../../components/Txt';
import { colors, radius, spacing } from '../../theme';
import { RSVP_LIMITS, RSVP_MESSAGE, RsvpField, RsvpInput, rsvpFields, validateRsvp } from './rsvp';

type Props = {
  visible: boolean;
  themeId: string;
  initial: RsvpInput;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: RsvpInput) => Promise<'ok' | 'closed' | 'invalid'>;
};

/**
 * 참석 응답 입력 — 하객(신청·고치기)과 만든 사람(직접 넣기·고치기)이 같이 쓴다.
 * 열 때마다 새로 그려 처음 값(initial)에서 시작한다.
 */
export function RsvpFormModal(props: Props) {
  return props.visible ? <RsvpForm {...props} /> : null;
}

function RsvpForm({ themeId, initial, title, submitLabel, onClose, onSubmit }: Props) {
  const [v, setV] = useState(initial);
  const [tried, setTried] = useState(false);
  const [closed, setClosed] = useState(false);
  const fields = rsvpFields(themeId);
  const bad = validateRsvp(v, themeId);
  const show = (f: RsvpField) => tried && bad.includes(f);
  const msg = (f: RsvpField) => (show(f) ? { type: 'error' as const, text: RSVP_MESSAGE[f] } : undefined);
  const submit = async () => {
    setTried(true);
    if (bad.length) return;
    const r = await onSubmit(v);
    if (r === 'closed') setClosed(true);
    if (r === 'ok') onClose();
  };
  return (
    <AppModal
      visible
      title={title}
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: submitLabel, onPress: submit },
      ]}
    >
      <View style={styles.form}>
        <TextField
          label="이름"
          required
          value={v.name}
          onChangeText={(name) => setV({ ...v, name })}
          maxLength={RSVP_LIMITS.name}
          invalid={show('name')}
          message={msg('name')}
        />
        {fields.includes('org') && (
          <TextField
            label="소속"
            required
            value={v.org}
            onChangeText={(org) => setV({ ...v, org })}
            maxLength={RSVP_LIMITS.org}
            invalid={show('org')}
            message={msg('org')}
          />
        )}
        {fields.includes('phone') && (
          <TextField
            label="연락처"
            required
            value={v.phone}
            onChangeText={(phone) => setV({ ...v, phone })}
            keyboardType="phone-pad"
            placeholder="010-1234-5678"
            invalid={show('phone')}
            message={msg('phone')}
          />
        )}
        <View style={styles.choice}>
          {[true, false].map((yes) => (
            <Pressable
              key={String(yes)}
              onPress={() => setV({ ...v, attending: yes })}
              accessibilityRole="button"
              accessibilityState={{ selected: v.attending === yes }}
              style={[styles.option, v.attending === yes && styles.optionOn]}
            >
              <Txt weight="semibold" color={v.attending === yes ? colors.brand : colors.label}>
                {yes ? '참석' : '불참'}
              </Txt>
            </Pressable>
          ))}
        </View>
        {fields.includes('companions') && v.attending && (
          <View style={styles.stepper}>
            <Txt style={styles.flex}>동반 인원</Txt>
            <Pressable
              onPress={() => setV({ ...v, companions: Math.max(0, v.companions - 1) })}
              accessibilityRole="button"
              accessibilityLabel="동반 인원 빼기"
            >
              <Txt variant="title">−</Txt>
            </Pressable>
            <Txt weight="semibold">{String(v.companions)}</Txt>
            <Pressable
              onPress={() => setV({ ...v, companions: Math.min(RSVP_LIMITS.companionsMax, v.companions + 1) })}
              accessibilityRole="button"
              accessibilityLabel="동반 인원 더하기"
            >
              <Txt variant="title">+</Txt>
            </Pressable>
          </View>
        )}
        {closed && (
          <Txt variant="caption" color={colors.danger}>
            마감되었어요
          </Txt>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md, alignSelf: 'stretch' },
  choice: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  optionOn: { borderColor: colors.brand },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
