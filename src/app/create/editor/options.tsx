import { Redirect, router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { BottomCTA } from '../../../components/BottomCTA';
import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { Txt } from '../../../components/Txt';
import { useEditor } from '../../../features/invitation/editorStore';
import { OptionalSection } from '../../../features/invitation/model';
import { useDraft } from '../../../features/invitation/useDraft';
import { colors, radius, spacing } from '../../../theme';

const FIXED = [
  { title: '기본 정보', body: '신랑측, 신부측 정보를 입력합니다.' },
  { title: '예식 정보', body: '예식장 위치, 예식 진행 시간을 입력합니다.' },
  { title: '인사말', body: '소중한 하객분에게 드릴 인사말을 입력합니다.' },
];

const OPTIONAL: { key: OptionalSection; title: string; body: string }[] = [
  { key: 'account', title: '계좌번호', body: '신랑측, 신부측의 계좌정보를 제공합니다.' },
  { key: 'gallery', title: '갤러리', body: '웨딩 촬영 등 갤러리 영역을 제공합니다.' },
  { key: 'guestbook', title: '방명록', body: '방명록 기능을 제공합니다.' },
  { key: 'ending', title: '엔딩', body: '초대장의 엔딩 페이지를 제공합니다.' },
  { key: 'bgm', title: 'BGM 설정', body: '초대장 BGM을 설정합니다.' },
];

/** Step 3. 입력항목 선택 */
export default function EditorOptions() {
  const draft = useDraft();
  const setEnabled = useEditor((s) => s.setEnabled);
  if (!draft) return <Redirect href="/create" />;

  return (
    <Screen
      header={<Header title="입력항목 선택" />}
      background={colors.surface}
      contentStyle={styles.content}
      footer={
        <BottomCTA>
          <Button label="다음" onPress={() => router.push('/create/editor/order')} />
        </BottomCTA>
      }
    >
      <Txt variant="caption" color={colors.muted} style={styles.hint}>
        초대장에서 사용할 항목을 선택해 주세요.
      </Txt>
      {FIXED.map((f) => (
        <View key={f.title} style={styles.card}>
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
      {OPTIONAL.map((o) => (
        <View key={o.key} style={styles.card}>
          <View style={styles.flex}>
            <Txt variant="bodyStrong">{o.title}</Txt>
            <Txt variant="caption" color={colors.muted}>
              {o.body}
            </Txt>
          </View>
          <Switch
            value={draft.enabled[o.key]}
            onValueChange={(v) => setEnabled(o.key, v)}
            trackColor={{ false: colors.hairline, true: colors.inkSoft }}
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
