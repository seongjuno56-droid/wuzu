import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { useT } from '../../../i18n';
import { colors, radius, spacing } from '../../../theme';
import { RsvpField, rsvpFields } from '../../rsvp/rsvp';
import { CORP_LIMITS, DRESS_CODES, isEmail, isPhone } from '../corporate';
import { useEditor } from '../editorStore';
import { CeremonyInfo, CorporateContent, ProgramItem, RsvpSettings, Speaker } from '../model';
import { DateField, FormLabel, Hint, PhotoOne } from './fields';
import { ListEditor } from './ListEditor';
import { addItem, newItemId, updateItem } from './listOps';
import { TimePickerModal } from './Pickers';

/** 기업 행사 입력 시트 (설계 4장) */

const useCorp = () => useEditor((s) => s.draft!.content as CorporateContent);
const usePatch = () => useEditor((s) => s.patch);

/** 참석 응답에서 받는 항목 이름 */
const FIELD_NAME: Record<RsvpField, string> = {
  name: '이름',
  org: '소속',
  phone: '연락처',
  attending: '참석 여부',
  companions: '동반 인원',
};

type DragProps = { onDragChange?: (dragging: boolean) => void };

/** 기본 정보: 행사명·주최(필수), 로고(선택), 초청인 직함·이름(둘 다 또는 둘 다 비움) */
export function CorporateBasicForm() {
  const b = useCorp().basic;
  const patch = usePatch();
  const set = (v: Partial<typeof b>) => patch('basic', v);
  const inviterHalf = !!b.inviterName.trim() !== !!b.inviterTitle.trim();
  return (
    <View style={styles.form}>
      <TextField
        label="행사명"
        required
        value={b.eventName}
        onChangeText={(eventName) => set({ eventName })}
        maxLength={CORP_LIMITS.eventName}
        invalid={!b.eventName.trim()}
        placeholder="예) 2026 파트너스 데이"
      />
      <TextField
        label="주최"
        required
        value={b.host}
        onChangeText={(host) => set({ host })}
        maxLength={CORP_LIMITS.host}
        invalid={!b.host.trim()}
        placeholder="회사·단체 이름"
      />
      <PhotoOne label="로고" uri={b.logo} onChange={(logo) => set({ logo })} keepPng />
      <View style={styles.group}>
        <FormLabel>초청인</FormLabel>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="직함"
              value={b.inviterTitle}
              onChangeText={(inviterTitle) => set({ inviterTitle })}
              maxLength={CORP_LIMITS.inviterTitle}
              invalid={inviterHalf && !b.inviterTitle.trim()}
              placeholder="예) 대표이사"
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="이름"
              value={b.inviterName}
              onChangeText={(inviterName) => set({ inviterName })}
              maxLength={CORP_LIMITS.inviterName}
              invalid={inviterHalf && !b.inviterName.trim()}
            />
          </View>
        </View>
        {inviterHalf && <Hint>직함과 이름을 함께 넣어 주세요.</Hint>}
      </View>
    </View>
  );
}

/** 행사 개요 시트 아래쪽: 대상·드레스코드 (일시·장소는 위의 공통 CeremonyForm) */
export function CorporateOverviewFields() {
  const e = useCorp().ceremony;
  const patch = usePatch();
  return (
    <View style={[styles.form, styles.after]}>
      <TextField
        label="대상"
        value={e.audience}
        onChangeText={(audience) => patch('ceremony', { audience })}
        maxLength={CORP_LIMITS.audience}
        placeholder="예) 파트너사 임직원"
      />
      <View style={styles.group}>
        <TextField
          label="드레스코드"
          value={e.dressCode}
          onChangeText={(dressCode) => patch('ceremony', { dressCode })}
          maxLength={CORP_LIMITS.dressCode}
        />
        <View style={styles.chips}>
          {DRESS_CODES().map((d) => (
            <Pressable
              key={d}
              onPress={() => patch('ceremony', { dressCode: d })}
              style={[styles.chip, e.dressCode === d && styles.chipOn]}
              accessibilityRole="button"
            >
              <Txt variant="caption" color={e.dressCode === d ? colors.brand : colors.label}>
                {d}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/** 프로그램: 시간(선택)·제목(필수)·담당/설명, 최대 12개, ☰ 끌어 순서 */
export function ProgramForm({ onDragChange }: DragProps) {
  // 기업 프로그램·모임 일정표가 같이 쓴다
  const items = useEditor((s) => (s.draft!.content as { program: { items: ProgramItem[] } }).program.items);
  const patch = usePatch();
  const set = (next: ProgramItem[]) => patch('program', { items: next });
  const [timeFor, setTimeFor] = useState<string | null>(null);
  const editing = items.find((i) => i.id === timeFor);
  return (
    <View style={styles.form}>
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={CORP_LIMITS.program}
        addLabel="순서 추가"
        onAdd={() => set(addItem(items, { id: newItemId(), time: '', title: '', detail: '' }, CORP_LIMITS.program))}
        onChange={set}
        renderItem={(it) => (
          <View style={styles.form}>
            <View style={styles.group}>
              <FormLabel>시간</FormLabel>
              <Pressable
                onPress={() => setTimeFor(it.id)}
                style={styles.box}
                accessibilityRole="button"
                accessibilityLabel="시간 선택"
              >
                <Txt color={it.time ? colors.text : colors.placeholder}>{it.time || '시간 선택'}</Txt>
                <Ionicons name="time-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <TextField
              label="제목"
              required
              value={it.title}
              onChangeText={(title) => set(updateItem(items, it.id, { title }))}
              maxLength={CORP_LIMITS.programTitle}
              invalid={!it.title.trim()}
            />
            <TextField
              label="담당·설명"
              value={it.detail}
              onChangeText={(detail) => set(updateItem(items, it.id, { detail }))}
              maxLength={CORP_LIMITS.programDetail}
            />
          </View>
        )}
      />
      <TimePickerModal
        visible={!!editing}
        value={editing?.time || '14:00'}
        onClose={() => setTimeFor(null)}
        onSelect={(time) => {
          if (editing) set(updateItem(items, editing.id, { time }));
          setTimeFor(null);
        }}
      />
    </View>
  );
}

/** 연사 소개: 사진·이름(필수)·직함·한 줄, 최대 6명 */
export function SpeakersForm({ onDragChange }: DragProps) {
  const items = useCorp().speakers.items;
  const patch = usePatch();
  const set = (next: Speaker[]) => patch('speakers', { items: next });
  const edit = (id: string, v: Partial<Speaker>) => set(updateItem(items, id, v));
  return (
    <View style={styles.form}>
      {!items.length && <Hint>연사를 한 명 이상 넣어 주세요.</Hint>}
      <ListEditor
        onDragChange={onDragChange}
        items={items}
        max={CORP_LIMITS.speakers}
        addLabel="연사 추가"
        onAdd={() =>
          set(addItem(items, { id: newItemId(), photo: null, name: '', title: '', line: '' }, CORP_LIMITS.speakers))
        }
        onChange={set}
        renderItem={(s) => (
          <View style={styles.form}>
            <PhotoOne label="사진" uri={s.photo} onChange={(photo) => edit(s.id, { photo })} />
            <TextField
              label="이름"
              required
              value={s.name}
              onChangeText={(name) => edit(s.id, { name })}
              maxLength={CORP_LIMITS.speakerName}
              invalid={!s.name.trim()}
            />
            <TextField
              label="직함"
              value={s.title}
              onChangeText={(title) => edit(s.id, { title })}
              maxLength={CORP_LIMITS.speakerTitle}
            />
            <TextField
              label="한 줄 소개"
              value={s.line}
              onChangeText={(line) => edit(s.id, { line })}
              maxLength={CORP_LIMITS.speakerLine}
            />
          </View>
        )}
      />
    </View>
  );
}

/** 오시는 길: 주소·지도는 행사 개요에서, 여기서는 주차·대중교통 안내 */
export function DirectionsForm() {
  const d = useCorp().directions;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <Hint>주소와 지도는 행사 개요에서 넣어요.</Hint>
      <TextArea
        label="주차 안내"
        value={d.parking}
        onChangeText={(parking) => patch('directions', { parking })}
        maxLength={CORP_LIMITS.directions}
        minHeight={72}
        placeholder="예) 건물 지하 2~4층, 3시간 무료"
      />
      <TextArea
        label="대중교통"
        value={d.transit}
        onChangeText={(transit) => patch('directions', { transit })}
        maxLength={CORP_LIMITS.directions}
        minHeight={72}
        placeholder="예) 2호선 삼성역 5번 출구 도보 5분"
      />
    </View>
  );
}

/** 참석 신청: 마감일(선택). 받는 항목은 정해져 있다 */
export function RsvpSettingsForm() {
  // 기업 참석 신청·모임 참석 여부가 같이 쓴다
  const c = useEditor((s) => s.draft!.content as { ceremony: CeremonyInfo; rsvp: RsvpSettings });
  const themeId = useEditor((s) => s.draft!.themeId);
  const t = useT();
  const patch = usePatch();
  const late = !!c.rsvp.deadline && c.rsvp.deadline > c.ceremony.date;
  return (
    <View style={styles.form}>
      <DateField
        label="마감일"
        range="future"
        value={c.rsvp.deadline}
        clearable
        start={c.ceremony.date}
        onChange={(deadline) => patch('rsvp', { deadline })}
        error={late ? '마감일은 행사일 전이어야 해요.' : undefined}
      />
      <Hint>비워 두면 행사 당일까지 받아요.</Hint>
      <View style={styles.group}>
        <FormLabel>받는 항목</FormLabel>
        <Txt variant="caption" color={colors.muted}>
          {rsvpFields(themeId)
            .map((f) => t(FIELD_NAME[f]))
            .join(' · ')}
        </Txt>
      </View>
      <Hint>
        {themeId === 'meetup'
          ? '받은 응답은 나의 초대장 카드의 [⋮ 더보기] > [참석 응답]에서 보고, 전화로 받은 응답도 직접 넣을 수 있어요.'
          : '받은 응답은 나의 초대장의 [참석 응답]에서 보고, 전화로 받은 응답도 직접 넣을 수 있어요.'}
      </Hint>
    </View>
  );
}

/** 문의처: 담당자(필수) + 전화나 메일 하나 이상 */
export function ContactForm() {
  const k = useCorp().contact;
  const patch = usePatch();
  const set = (v: Partial<typeof k>) => patch('contact', v);
  const badPhone = !!k.phone.trim() && !isPhone(k.phone);
  const badEmail = !!k.email.trim() && !isEmail(k.email);
  return (
    <View style={styles.form}>
      <TextField
        label="담당자"
        required
        value={k.name}
        onChangeText={(name) => set({ name })}
        maxLength={CORP_LIMITS.contactName}
        invalid={!k.name.trim()}
        placeholder="예) 행사 사무국"
      />
      <TextField
        label="전화"
        value={k.phone}
        onChangeText={(phone) => set({ phone })}
        keyboardType="phone-pad"
        placeholder="02-123-4567"
        invalid={badPhone}
        message={badPhone ? { type: 'error', text: '전화번호 형식을 확인해 주세요.' } : undefined}
      />
      <TextField
        label="이메일"
        value={k.email}
        onChangeText={(email) => set({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="event@company.com"
        invalid={badEmail}
        message={badEmail ? { type: 'error', text: '이메일 형식을 확인해 주세요.' } : undefined}
      />
      {!k.phone.trim() && !k.email.trim() && <Hint>전화나 이메일 중 하나는 넣어 주세요.</Hint>}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  /** 위 공통 일시·장소 폼과 떨어지게 */
  after: { marginTop: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipOn: { borderColor: colors.brand },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
