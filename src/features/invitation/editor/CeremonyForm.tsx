import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { OptionGroup } from '../../../components/OptionGroup';
import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { toast } from '../../../components/Toast';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { formatKoreanTime, LIMITS, parseDate, WEEKDAYS_KO } from '../model';
import { AddressSearchModal } from './AddressSearchModal';
import { Check, FormLabel, Hint, PhotoSlots } from './fields';
import { DatePickerModal, TimePickerModal } from './Pickers';

/** 날짜·시간 고르는 버튼 모양 입력칸 */
function PickerField(props: { label: string; value: string; icon: 'calendar-outline' | 'time-outline'; onPress: () => void }) {
  return (
    <View style={styles.flexGroup}>
      <FormLabel required>{props.label}</FormLabel>
      <Pressable onPress={props.onPress} style={styles.pickerField} accessibilityRole="button" accessibilityLabel={`${props.label} 선택`}>
        <Txt style={styles.flex}>{props.value}</Txt>
        <Ionicons name={props.icon} size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

/** 예식정보: 예식장명, 주소(검색/직접), 층·홀, 예식일·시간, 지도, 캘린더·디데이 */
export function CeremonyForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const e = useEditor((s) => s.draft!.content.ceremony);
  const patch = useEditor((s) => s.patch);
  const set = (values: Partial<typeof e>) => patch('ceremony', values);
  const [modal, setModal] = useState<'address' | 'date' | 'time' | null>(null);
  const search = e.addressMode === 'search';
  const d = parseDate(e.date);

  return (
    <View style={styles.form}>
      <TextField
        label="예식장명"
        required
        placeholder="예식장 이름"
        value={e.venue}
        onChangeText={(venue) => set({ venue })}
        maxLength={LIMITS.venue}
        invalid={!e.venue.trim()}
      />

      <View style={styles.group}>
        <FormLabel required>주소</FormLabel>
        <OptionGroup
          value={e.addressMode}
          onChange={(addressMode) => set({ addressMode })}
          options={[
            { value: 'search', label: '주소 검색' },
            { value: 'manual', label: '직접 입력' },
          ]}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              placeholder="우편번호"
              value={e.zonecode}
              onChangeText={(zonecode) => set({ zonecode })}
              editable={!search}
              maxLength={10}
            />
          </View>
          {search && <Button label="주소 검색" variant="outline" size="md" onPress={() => setModal('address')} />}
        </View>
        <TextField
          placeholder={search ? '주소 검색을 눌러 주소를 찾아주세요' : '주소'}
          value={e.address}
          onChangeText={(address) => set({ address })}
          editable={!search}
          maxLength={LIMITS.address}
          invalid={!e.address.trim()}
        />
        <TextField
          placeholder="상세주소"
          value={e.addressDetail}
          onChangeText={(addressDetail) => set({ addressDetail })}
          maxLength={LIMITS.address}
        />
      </View>

      <TextArea
        label="층 / 홀"
        value={e.hall}
        onChangeText={(hall) => set({ hall })}
        maxLength={LIMITS.hall}
        placeholder="3층, 그랜드 홀"
        minHeight={56}
      />

      <View style={styles.row}>
        <PickerField
          label="예식일"
          icon="calendar-outline"
          value={`${e.date} (${WEEKDAYS_KO[d.getDay()]})`}
          onPress={() => setModal('date')}
        />
        <PickerField label="예식시간" icon="time-outline" value={formatKoreanTime(e.time)} onPress={() => setModal('time')} />
      </View>

      <View style={styles.group}>
        <FormLabel>지도</FormLabel>
        <OptionGroup
          value={e.mapMode}
          onChange={(mapMode) => set({ mapMode })}
          options={[
            { value: 'use', label: '지도 사용' },
            { value: 'none', label: '사용안함' },
          ]}
        />
        {e.mapMode === 'use' &&
          (search ? (
            <Hint>검색한 주소로 지도 카드와 카카오맵·네이버지도 바로가기를 보여드려요.</Hint>
          ) : (
            <>
              <Hint>직접 입력한 주소는 약도 이미지를 올려주세요. (1~3장, jpg·jpeg·png)</Hint>
              <PhotoSlots
                photos={e.mapImages}
                onChange={(mapImages) => set({ mapImages })}
                max={LIMITS.mapImages}
                minCount={1}
                columns={3}
                onDragChange={onDragChange}
              />
            </>
          ))}
      </View>

      <View style={styles.group}>
        <FormLabel>추가 옵션 선택</FormLabel>
        <View style={styles.checks}>
          <Check label="캘린더" value={e.showCalendar} onChange={(showCalendar) => set({ showCalendar })} />
          <Check label="디데이" value={e.showDday} onChange={(showDday) => set({ showDday })} />
        </View>
      </View>

      <AddressSearchModal
        visible={modal === 'address'}
        onClose={(failed) => {
          setModal(null);
          if (failed) {
            toast('주소 검색을 불러오지 못했어요. 직접 입력을 이용해 주세요.');
            set({ addressMode: 'manual' });
          }
        }}
        onSelect={(r) => {
          set(r);
          setModal(null);
        }}
      />
      <DatePickerModal
        visible={modal === 'date'}
        value={e.date}
        onClose={() => setModal(null)}
        onSelect={(date) => {
          set({ date });
          setModal(null);
        }}
      />
      <TimePickerModal
        visible={modal === 'time'}
        value={e.time}
        onClose={() => setModal(null)}
        onSelect={(time) => {
          set({ time });
          setModal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGroup: { flex: 1, gap: spacing.sm },
  form: { gap: spacing.xl },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  checks: { flexDirection: 'row', gap: spacing.xl },
  pickerField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
  },
});
