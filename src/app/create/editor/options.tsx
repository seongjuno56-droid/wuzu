import { Redirect, router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { useEditor } from '../../../features/invitation/editorStore';
import { themeDef } from '../../../features/invitation/themes';
import { useDraft } from '../../../features/invitation/useDraft';
import { colors, radius, spacing } from '../../../theme';

/** Step 3. 입력항목 선택 */
export default function EditorOptions() {
  const draft = useDraft();
  const setEnabled = useEditor((s) => s.setEnabled);
  if (!draft) return <Redirect href="/create" />;
  // 테마마다 필수·선택 항목과 설명이 다르다
  const def = themeDef(draft.themeId);

  // 순서는 정보 입력 화면 하단 독바에서 꾹 눌러 끌어 바꾼다 (따로 순서 화면 없음).
  // 수정 모드는 설정으로 올 때 쌓아 둔 compose 로 돌아가고(중복 방지), 새로 만들 때는 compose 를 새로 연다
  const toCompose = () =>
    useEditor.getState().origin ? router.dismissTo('/create/editor/compose') : router.push('/create/editor/compose');

  return (
    <Screen
      header={<Header title="입력항목 선택" />}
      background={colors.surface}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="정보 입력" onPress={toCompose} />
        </BottomCTA>
      }
    >
      <Txt variant="caption" color={colors.muted} style={styles.hint}>
        초대장에서 사용할 항목을 선택해 주세요.
      </Txt>
      {def.fixed.map((f) => (
        <View key={f.key} style={styles.card}>
          <View style={styles.flex}>
            <Txt variant="bodyStrong">{f.title}</Txt>
            <Txt variant="caption" color={colors.muted}>
              {f.body}
            </Txt>
          </View>
          <Txt variant="tiny" color={colors.faint}>
            필수
          </Txt>
        </View>
      ))}
      <View style={styles.divider} />
      {def.optional.map((o) => (
        <View key={o.key} style={styles.card}>
          <View style={styles.flex}>
            <Txt variant="bodyStrong">{o.title}</Txt>
            <Txt variant="caption" color={colors.muted}>
              {o.body}
            </Txt>
          </View>
          <Switch
            value={!!draft.enabled[o.key]}
            onValueChange={(v) => setEnabled(o.key, v)}
            trackColor={{ false: colors.hairline, true: colors.brand }}
            thumbColor={colors.canvas}
            // 웹은 켜진 상태 손잡이 색을 따로 지정해야 한다
            {...({ activeThumbColor: colors.canvas } as object)}
            accessibilityLabel={`${o.title} 사용`}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: spacing.lg, gap: spacing.sm },
  hint: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: spacing.sm },
});
