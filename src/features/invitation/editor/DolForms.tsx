import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { addDays, birthDateProblem, DOL_LIMITS } from '../dol';
import { useEditor } from '../editorStore';
import { DolContent, LIMITS, TimelineItem, toDateString } from '../model';
import { AccountFields, DateField, FormLabel, Hint, PhotoOne } from './fields';
import { ListEditor } from './ListEditor';
import { addItem, newItemId, updateItem } from './listOps';

/** 돌잔치 입력 시트 — 기본 정보·아이 프로필·성장 이야기·마음 전하는 곳 (설계 3장) */

const useDol = () => useEditor((s) => s.draft!.content as DolContent);
const usePatch = () => useEditor((s) => s.patch);

/** 기본 정보: 아이(이름·부르는 이름·태어난 날·표지 사진) + 보호자 1~4명 */
export function DolBasicForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const c = useDol();
  const b = c.basic;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextField
        label="아이 이름"
        required
        value={b.childName}
        onChangeText={(childName) => patch('basic', { childName })}
        maxLength={DOL_LIMITS.name}
        invalid={!b.childName.trim()}
        placeholder="이시안"
      />
      <TextField
        label="부르는 이름"
        value={b.nickname}
        onChangeText={(nickname) => patch('basic', { nickname })}
        maxLength={DOL_LIMITS.name}
        placeholder="비우면 성을 뺀 이름으로 불러요"
      />
      <DateField
        start={addDays(toDateString(new Date()), -300)}
        label="태어난 날"
        range="past"
        required
        value={b.birthDate}
        onChange={(birthDate) => patch('basic', { birthDate })}
        error={birthDateProblem(c) ? '태어난 날을 확인해 주세요. 행사일보다 앞이어야 해요.' : undefined}
      />
      <PhotoOne label="표지 사진" required uri={b.photo} onChange={(photo) => patch('basic', { photo })} />
      <Txt variant="title" style={styles.side}>
        보호자
      </Txt>
      <ListEditor
        onDragChange={onDragChange}
        items={b.guardians}
        max={DOL_LIMITS.guardians}
        addLabel="보호자 추가"
        onAdd={() =>
          patch('basic', {
            guardians: addItem(b.guardians, { id: newItemId(), relation: '', name: '' }, DOL_LIMITS.guardians),
          })
        }
        onChange={(guardians) => patch('basic', { guardians })}
        renderItem={(g) => (
          <View style={styles.pair}>
            <View style={styles.narrow}>
              <TextField
                placeholder="관계"
                value={g.relation}
                onChangeText={(relation) => patch('basic', { guardians: updateItem(b.guardians, g.id, { relation }) })}
                maxLength={DOL_LIMITS.relation}
                invalid={!g.relation.trim()}
              />
            </View>
            <View style={styles.wide}>
              <TextField
                placeholder="이름"
                value={g.name}
                onChangeText={(name) => patch('basic', { guardians: updateItem(b.guardians, g.id, { name }) })}
                maxLength={DOL_LIMITS.name}
                invalid={!g.name.trim()}
              />
            </View>
          </View>
        )}
      />
      <Hint>관계는 아빠·엄마·할머니처럼 자유롭게 적어 주세요.</Hint>
    </View>
  );
}

/** 아이 프로필: 사진·소개·해시태그 (최대 5개) */
export function DolProfileForm() {
  const p = useDol().profile;
  const patch = usePatch();
  const [tag, setTag] = useState('');
  const addTag = () => {
    const t = tag.replace(/^#+/, '').trim().slice(0, DOL_LIMITS.hashtag);
    if (t && p.hashtags.length < DOL_LIMITS.hashtags && !p.hashtags.includes(t)) {
      patch('profile', { hashtags: [...p.hashtags, t] });
    }
    setTag('');
  };
  return (
    <View style={styles.form}>
      <PhotoOne label="사진" uri={p.photo} onChange={(photo) => patch('profile', { photo })} />
      <TextArea
        label="소개"
        value={p.intro}
        onChangeText={(intro) => patch('profile', { intro })}
        maxLength={DOL_LIMITS.intro}
        placeholder="울다 웃다 자다, 그렇게 1년이 지나 이제 돌이에요."
        minHeight={110}
      />
      <View style={styles.group}>
        <FormLabel>해시태그</FormLabel>
        {p.hashtags.length > 0 && (
          <View style={styles.chips}>
            {p.hashtags.map((h) => (
              <Pressable
                key={h}
                onPress={() => patch('profile', { hashtags: p.hashtags.filter((x) => x !== h) })}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`#${h} 지우기`}
              >
                <Txt variant="caption" color={colors.brand} raw>
                  {`#${h}`}
                </Txt>
                <Ionicons name="close" size={12} color={colors.brand} />
              </Pressable>
            ))}
          </View>
        )}
        {p.hashtags.length < DOL_LIMITS.hashtags && (
          <TextField
            placeholder="웃음요정"
            value={tag}
            onChangeText={setTag}
            onSubmitEditing={addTag}
            onBlur={addTag}
            maxLength={DOL_LIMITS.hashtag + 1}
            returnKeyType="done"
          />
        )}
        <Hint>최대 5개 · 쓰고 완료를 누르면 추가돼요.</Hint>
      </View>
    </View>
  );
}

/** 성장 이야기: 항목(날짜·제목·한 줄·사진) 최대 6개 */
export function DolTimelineForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const items = useDol().timeline.items;
  const patch = usePatch();
  const set = (next: TimelineItem[]) => patch('timeline', { items: next });
  // 사용자가 고친 항목은 태어난 날을 바꿔도 미리 채우기가 덮어쓰지 않는다
  const edit = (id: string, change: Partial<TimelineItem>) => set(updateItem(items, id, { ...change, edited: true }));
  return (
    <View style={styles.form}>
      {!items.length && <Hint>기본 정보에 태어난 날을 넣으면 예시 4개가 채워져요.</Hint>}
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={DOL_LIMITS.timeline}
        addLabel="이야기 추가"
        onAdd={() =>
          set(
            addItem(
              items,
              { id: newItemId(), photo: null, date: '', title: '', text: '', edited: true },
              DOL_LIMITS.timeline,
            ),
          )
        }
        onChange={set}
        renderItem={(it) => (
          <View style={styles.form}>
            <DateField label="날짜" range="any" value={it.date} onChange={(date) => edit(it.id, { date })} />
            <TextField
              label="제목"
              required
              value={it.title}
              onChangeText={(title) => edit(it.id, { title })}
              maxLength={DOL_LIMITS.itemTitle}
              invalid={!it.title.trim()}
            />
            <TextField
              label="한 줄"
              value={it.text}
              onChangeText={(text) => edit(it.id, { text })}
              maxLength={DOL_LIMITS.itemText}
            />
            <PhotoOne label="사진" uri={it.photo} onChange={(photo) => edit(it.id, { photo })} />
          </View>
        )}
      />
    </View>
  );
}

/** 마음 전하는 곳: 안내 문구 + 보호자별 계좌 (한 명 이상) */
export function DolAccountForm() {
  const c = useDol();
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextArea
        label="안내 문구"
        value={c.account.message}
        onChangeText={(message) => patch('account', { message })}
        maxLength={LIMITS.accountMessage}
        minHeight={90}
      />
      {c.basic.guardians.map((g) => (
        <AccountFields
          key={g.id}
          label={`${g.relation} ${g.name}`.trim() || '보호자'}
          account={c.account.accounts[g.id] ?? { bank: '', number: '' }}
          onChange={(a) => patch('account', { accounts: { ...c.account.accounts, [g.id]: a } })}
        />
      ))}
      <Hint>보호자는 기본 정보에서 바꿀 수 있어요. 한 명 이상 계좌를 넣어 주세요.</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  side: { marginTop: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.sm },
  narrow: { flex: 2 },
  wide: { flex: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
  },
});
