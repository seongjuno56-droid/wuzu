import { StyleSheet, View } from 'react-native';

import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { MEETUP_LIMITS } from '../meetup';
import { MeetupContent, Notice } from '../model';
import { FormLabel, Hint, PhotoOne } from './fields';
import { ListEditor } from './ListEditor';
import { addItem, newItemId, updateItem } from './listOps';

/** 모임 입력 시트 — 기본 정보·안내사항·회비 계좌 (설계 5장). 일정표·참석 여부는 기업 폼을 같이 쓴다 */

const useMeetup = () => useEditor((s) => s.draft!.content as MeetupContent);
const usePatch = () => useEditor((s) => s.patch);

/** 기본 정보: 모임 이름(필수), 주최(선택), 대표 사진(선택) */
export function MeetupBasicForm() {
  const b = useMeetup().basic;
  const patch = usePatch();
  const set = (v: Partial<typeof b>) => patch('basic', v);
  return (
    <View style={styles.form}>
      <TextField
        label="모임 이름"
        required
        value={b.eventName}
        onChangeText={(eventName) => set({ eventName })}
        maxLength={MEETUP_LIMITS.eventName}
        invalid={!b.eventName.trim()}
        placeholder="예) 03학번 연말 송년회"
      />
      <TextField
        label="주최"
        value={b.host}
        onChangeText={(host) => set({ host })}
        maxLength={MEETUP_LIMITS.host}
        placeholder="예) 김모임 또는 우리 동기 모임"
      />
      <View style={styles.group}>
        <PhotoOne label="대표 사진" uri={b.photo} onChange={(photo) => set({ photo })} />
        <Hint>넣으면 표지에 들어가요.</Hint>
      </View>
    </View>
  );
}

/** 안내사항: 제목(필수)·내용 카드, 최대 5개, ☰ 끌어 순서 */
export function NoticesForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const items = useMeetup().notices.items;
  const patch = usePatch();
  const set = (next: Notice[]) => patch('notices', { items: next });
  return (
    <View style={styles.form}>
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={MEETUP_LIMITS.notices}
        addLabel="안내 추가"
        onAdd={() => set(addItem(items, { id: newItemId(), title: '', text: '' }, MEETUP_LIMITS.notices))}
        onChange={set}
        renderItem={(n) => (
          <View style={styles.form}>
            <TextField
              label="제목"
              required
              value={n.title}
              onChangeText={(title) => set(updateItem(items, n.id, { title }))}
              maxLength={MEETUP_LIMITS.noticeTitle}
              invalid={!n.title.trim()}
            />
            <TextArea
              label="내용"
              value={n.text}
              onChangeText={(text) => set(updateItem(items, n.id, { text }))}
              maxLength={MEETUP_LIMITS.noticeText}
              minHeight={72}
            />
          </View>
        )}
      />
    </View>
  );
}

/** 회비 계좌: 금액(선택) + 은행·계좌번호·예금주(필수) */
export function MeetupAccountForm() {
  const a = useMeetup().account;
  const patch = usePatch();
  const set = (v: Partial<typeof a>) => patch('account', v);
  return (
    <View style={styles.form}>
      <TextField
        label="회비"
        value={a.amount}
        onChangeText={(amount) => set({ amount })}
        maxLength={MEETUP_LIMITS.amount}
        placeholder="예) 1인 3만원"
      />
      <View style={styles.group}>
        <FormLabel required>계좌</FormLabel>
        <View style={styles.row}>
          <View style={styles.narrow}>
            <TextField
              placeholder="은행"
              value={a.bank}
              onChangeText={(bank) => set({ bank })}
              maxLength={MEETUP_LIMITS.bank}
              invalid={!a.bank.trim()}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              placeholder="계좌번호"
              value={a.number}
              onChangeText={(number) => set({ number })}
              maxLength={MEETUP_LIMITS.number}
              keyboardType="numbers-and-punctuation"
              invalid={!a.number.trim()}
            />
          </View>
        </View>
        <TextField
          placeholder="예금주"
          value={a.holder}
          onChangeText={(holder) => set({ holder })}
          maxLength={MEETUP_LIMITS.holder}
          invalid={!a.holder.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  narrow: { width: 120 },
  flex: { flex: 1 },
});
