import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { OptionGroup } from '../../../components/OptionGroup';
import { TextArea } from '../../../components/TextArea';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { pickImages } from '../media';
import { asWedding, defaultAccountMessage, LIMITS } from '../model';
import { AccountFields, Check, FormLabel, Hint, PersonFields } from './fields';

const useContent = () => useEditor((s) => s.draft!.content);
const usePatch = () => useEditor((s) => s.patch);

/** 기본정보: 신랑측·신부측 (이름·호칭 10자) */
export function BasicForm() {
  const b = asWedding(useContent()).basic;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <Txt variant="title">신랑측</Txt>
      <PersonFields label="신랑" required person={b.groom} titlePlaceholder="아들" onChange={(groom) => patch('basic', { groom })} />
      <PersonFields label="신랑 아버지" showDeceased person={b.groomFather} titlePlaceholder="아버지" onChange={(groomFather) => patch('basic', { groomFather })} />
      <PersonFields label="신랑 어머니" showDeceased person={b.groomMother} titlePlaceholder="어머니" onChange={(groomMother) => patch('basic', { groomMother })} />
      <Txt variant="title" style={styles.side}>
        신부측
      </Txt>
      <PersonFields label="신부" required person={b.bride} titlePlaceholder="딸" onChange={(bride) => patch('basic', { bride })} />
      <PersonFields label="신부 아버지" showDeceased person={b.brideFather} titlePlaceholder="아버지" onChange={(brideFather) => patch('basic', { brideFather })} />
      <PersonFields label="신부 어머니" showDeceased person={b.brideMother} titlePlaceholder="어머니" onChange={(brideMother) => patch('basic', { brideMother })} />
    </View>
  );
}

/** 인사말: 내용 1~300, 사진 1장, 신랑·신부 이름 삽입 */
export function GreetingForm() {
  const g = useContent().greeting;
  const dol = useEditor((s) => s.draft!.themeId === 'dol');
  const patch = usePatch();
  const pick = async () => {
    const [photo] = await pickImages(1);
    if (photo) patch('greeting', { photo });
  };
  return (
    <View style={styles.form}>
      <TextArea
        label="내용"
        required
        value={g.content}
        onChangeText={(content) => patch('greeting', { content })}
        maxLength={LIMITS.greeting}
        placeholder="인사말을 입력하세요."
        invalid={!g.content.trim()}
        minHeight={140}
      />
      <View style={styles.group}>
        <FormLabel>사진</FormLabel>
        {g.photo ? (
          <View style={styles.single}>
            <Image source={{ uri: g.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Pressable onPress={() => patch('greeting', { photo: null })} style={styles.remove} accessibilityLabel="사진 삭제">
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pick} style={[styles.single, styles.add]} accessibilityRole="button" accessibilityLabel="사진 추가">
            <Ionicons name="add" size={24} color={colors.muted} />
          </Pressable>
        )}
        <Hint>최대 1장 · jpg, jpeg, png</Hint>
      </View>
      <View style={styles.group}>
        <FormLabel>추가 옵션 선택</FormLabel>
        <Check
          label={dol ? '보호자 이름 삽입' : '신랑, 신부 이름 삽입'}
          value={g.appendNames}
          onChange={(appendNames) => patch('greeting', { appendNames })}
        />
        <Hint>
          {dol ? '인사말 마지막에 보호자 이름이 들어가요.' : '인사말 마지막에 "길동, 춘향 드림."처럼 이름이 들어가요.'}
        </Hint>
      </View>
    </View>
  );
}

/** 계좌번호: 안내문(선택), 신랑·신부 필수, 부모님 선택 */
export function AccountForm() {
  const a = asWedding(useContent()).account;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <TextArea
        label="내용"
        value={a.message}
        onChangeText={(message) => patch('account', { message })}
        maxLength={LIMITS.accountMessage}
        placeholder="내용을 입력하세요."
        minHeight={96}
        right={
          <Pressable onPress={() => patch('account', { message: defaultAccountMessage() })} hitSlop={6}>
            <Txt variant="tiny" color={colors.infoInk}>
              기본 문구 넣기
            </Txt>
          </Pressable>
        }
      />
      <Txt variant="title">신랑측</Txt>
      <AccountFields label="신랑" required account={a.groom} onChange={(groom) => patch('account', { groom })} />
      <AccountFields label="신랑 아버지" account={a.groomFather} onChange={(groomFather) => patch('account', { groomFather })} />
      <AccountFields label="신랑 어머니" account={a.groomMother} onChange={(groomMother) => patch('account', { groomMother })} />
      <Txt variant="title" style={styles.side}>
        신부측
      </Txt>
      <AccountFields label="신부" required account={a.bride} onChange={(bride) => patch('account', { bride })} />
      <AccountFields label="신부 아버지" account={a.brideFather} onChange={(brideFather) => patch('account', { brideFather })} />
      <AccountFields label="신부 어머니" account={a.brideMother} onChange={(brideMother) => patch('account', { brideMother })} />
    </View>
  );
}

/** 방명록: 스타일만 고른다 (작성 규칙은 하객 화면에서 적용) */
export function GuestbookForm() {
  const g = useContent().guestbook;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <FormLabel>스타일 선택</FormLabel>
      <OptionGroup
        value={String(g.style) as '1' | '2'}
        onChange={(v) => patch('guestbook', { style: Number(v) as 1 | 2 })}
        options={[
          { value: '1', label: '스타일1 (카드)' },
          { value: '2', label: '스타일2 (목록)' },
        ]}
      />
      <Hint>
        하객이 방명록을 남길 때: 이름 {LIMITS.guestbook.name}자, 비밀번호 {LIMITS.guestbook.passwordMin}~
        {LIMITS.guestbook.passwordMax}자, 내용 {LIMITS.guestbook.content}자까지
      </Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  side: { marginTop: spacing.md },
  single: { width: 104, height: 104, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  add: { borderWidth: 1, borderColor: colors.hairline, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
