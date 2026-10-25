import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { SortableGrid } from '../../../components/SortableGrid';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { pickImages } from '../media';
import { BankAccount, DateRange, LIMITS, Person, toDateString } from '../model';
import { DatePickerModal } from './Pickers';

/** 폼 안의 소제목 (신랑측, 사진, 추가 옵션 선택 …) */
export function FormLabel({ children, required, right }: { children: ReactNode; required?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.labelRow}>
      <Txt variant="bodyStrong" style={styles.flex}>
        {children}
        {required && <Txt variant="bodyStrong" color={colors.danger}> *</Txt>}
      </Txt>
      {right}
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <Txt variant="tiny" color={colors.muted}>
      {children}
    </Txt>
  );
}

/** 체크박스 + 문구 */
export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.check}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      hitSlop={6}
    >
      <View style={[styles.box, value && styles.boxOn]}>
        {value && <Ionicons name="checkmark" size={14} color={colors.canvas} />}
      </View>
      <Txt>{label}</Txt>
    </Pressable>
  );
}

/** 이름 + 호칭 (+ 故人) 한 줄. 필수면 둘 다, 선택이면 짝이 맞아야 한다 */
export function PersonFields(props: {
  label: string;
  person: Person;
  onChange: (p: Person) => void;
  required?: boolean;
  titlePlaceholder: string;
  showDeceased?: boolean;
}) {
  const { label, person, onChange, required, titlePlaceholder, showDeceased } = props;
  const hasName = !!person.name.trim();
  const hasTitle = !!person.title.trim();
  const nameInvalid = required ? !hasName : hasTitle && !hasName;
  const titleInvalid = required ? !hasTitle : hasName && !hasTitle;
  return (
    <View style={styles.group}>
      <FormLabel
        required={required}
        right={
          showDeceased && (
            <Check label="故人" value={person.deceased} onChange={(deceased) => onChange({ ...person, deceased })} />
          )
        }
      >
        {label}
      </FormLabel>
      <View style={styles.pair}>
        <View style={styles.wide}>
          <TextField
            placeholder="성함"
            value={person.name}
            onChangeText={(name) => onChange({ ...person, name })}
            maxLength={LIMITS.personName}
            invalid={nameInvalid}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            placeholder={titlePlaceholder}
            value={person.title}
            onChangeText={(title) => onChange({ ...person, title })}
            maxLength={LIMITS.personName}
            invalid={titleInvalid}
          />
        </View>
      </View>
    </View>
  );
}

/** 은행 + 계좌번호 한 줄 */
export function AccountFields(props: {
  label: string;
  account: BankAccount;
  onChange: (a: BankAccount) => void;
  required?: boolean;
}) {
  const { label, account, onChange, required } = props;
  const hasBank = !!account.bank.trim();
  const hasNumber = !!account.number.trim();
  return (
    <View style={styles.group}>
      <FormLabel required={required}>{label}</FormLabel>
      <View style={styles.pair}>
        <View style={styles.narrowAccount}>
          <TextField
            placeholder="은행"
            value={account.bank}
            onChangeText={(bank) => onChange({ ...account, bank })}
            maxLength={LIMITS.bank}
            invalid={required ? !hasBank : hasNumber && !hasBank}
          />
        </View>
        <View style={styles.wide}>
          <TextField
            placeholder="계좌번호"
            value={account.number}
            onChangeText={(number) => onChange({ ...account, number })}
            maxLength={LIMITS.accountNumber}
            keyboardType="numbers-and-punctuation"
            invalid={required ? !hasNumber : hasBank && !hasNumber}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * 사진 칸: 등록된 사진(☰ 끌어서 순서 변경, × 삭제) + 추가 칸.
 * minCount 보다 적으면 빈 칸을 빨간 테두리로 보여준다.
 */
export function PhotoSlots(props: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max: number;
  minCount?: number;
  columns?: number;
  onDragChange?: (dragging: boolean) => void;
}) {
  const { photos, onChange, max, minCount = 0, columns = 4, onDragChange } = props;
  const add = async () => {
    const picked = await pickImages(max - photos.length);
    if (picked.length) onChange([...photos, ...picked].slice(0, max));
  };
  const missing = Math.max(0, minCount - photos.length);

  return (
    <View style={styles.group}>
      {photos.length > 0 && (
        <SortableGrid
          items={photos}
          keyOf={(p) => p}
          columns={columns}
          gap={spacing.sm}
          onChange={onChange}
          onDragChange={onDragChange}
          renderItem={(uri, { handle }) => (
            <View style={styles.photo}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View {...handle} style={styles.photoHandle} accessibilityLabel="사진 순서 이동">
                <Ionicons name="move" size={14} color="#fff" />
              </View>
              <Pressable
                onPress={() => onChange(photos.filter((p) => p !== uri))}
                style={styles.photoRemove}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="사진 삭제"
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          )}
        />
      )}
      {photos.length < max && (
        <View style={styles.addRow}>
          {Array.from({ length: Math.max(1, Math.min(columns, missing || 1)) }, (_, i) => (
            <Pressable
              key={i}
              onPress={add}
              style={[styles.addTile, { width: `${100 / columns - 2}%` }, i < missing && styles.addTileRequired]}
              accessibilityRole="button"
              accessibilityLabel="사진 추가"
            >
              <Ionicons name="add" size={22} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
      <Hint>
        {`${photos.length}/${max}장`}
        {minCount ? ` · ${minCount}장 이상` : ''}
      </Hint>
    </View>
  );
}

/** 사진 한 장 칸: 있으면 미리보기 + ×, 없으면 + (필수면 빨간 테두리) */
export function PhotoOne({
  label,
  uri,
  onChange,
  required,
  keepPng,
}: {
  label: string;
  uri: string | null;
  onChange: (uri: string | null) => void;
  required?: boolean;
  /** PNG 를 그대로 둔다 (로고의 투명 배경) */
  keepPng?: boolean;
}) {
  const pick = async () => {
    const [photo] = await pickImages(1, { keepPng });
    if (photo) onChange(photo);
  };
  return (
    <View style={styles.group}>
      <FormLabel required={required}>{label}</FormLabel>
      {uri ? (
        <View style={styles.onePhoto}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Pressable onPress={() => onChange(null)} style={styles.oneRemove} accessibilityLabel="사진 삭제">
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pick}
          style={[styles.onePhoto, styles.oneAdd, required && styles.oneRequired]}
          accessibilityRole="button"
          accessibilityLabel="사진 추가"
        >
          <Ionicons name="add" size={24} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

/** 날짜 칸 — 누르면 달력 */
export function DateField({
  label,
  value,
  onChange,
  required,
  range,
  error,
  start,
  clearable,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
  range: DateRange;
  /** 날짜는 넣었지만 규칙에 어긋날 때 칸 아래 안내 */
  error?: string;
  /** 값이 없을 때 달력이 열리는 날 (기본: 오늘) */
  start?: string;
  /** [지우기]로 빈 값을 넣을 수 있다 */
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <FormLabel
        required={required}
        right={
          clearable && !!value ? (
            <Pressable onPress={() => onChange('')} hitSlop={6} accessibilityRole="button">
              <Txt variant="tiny" color={colors.infoInk}>
                지우기
              </Txt>
            </Pressable>
          ) : undefined
        }
      >
        {label}
      </FormLabel>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.dateBox, ((required && !value) || !!error) && styles.oneRequired]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Txt color={value ? colors.text : colors.placeholder}>{value || '날짜 선택'}</Txt>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>
      {!!error && (
        <Txt variant="tiny" color={colors.danger}>
          {error}
        </Txt>
      )}
      <DatePickerModal
        visible={open}
        value={value || start || toDateString(new Date())}
        range={range}
        onClose={() => setOpen(false)}
        onSelect={(date) => {
          onChange(date);
          setOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  onePhoto: { width: 96, height: 120, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  oneAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
  },
  oneRequired: { borderColor: colors.danger },
  oneRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  flex: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.sm },
  wide: { flex: 1 },
  narrow: { width: 104 },
  narrowAccount: { width: 120 },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  photo: { flex: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  photoHandle: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
  } as object,
  photoRemove: {
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
  addRow: { flexDirection: 'row', gap: spacing.sm },
  addTile: {
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileRequired: { borderColor: colors.danger },
});
