import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppModal } from '../../../components/AppModal';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { formatKoreanTime, monthMatrix, parseDate, toDateString, WEEKDAYS_KO } from '../model';

const pad = (n: number) => String(n).padStart(2, '0');

/** 달력에서 하루 고르기 (오늘 이전 날짜는 고를 수 없다) */
export function DatePickerModal(props: { visible: boolean; value: string; onClose: () => void; onSelect: (date: string) => void }) {
  const { visible, value, onClose, onSelect } = props;
  const [picked, setPicked] = useState(value);
  const [month, setMonth] = useState(() => {
    const d = parseDate(value);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  useEffect(() => {
    if (!visible) return;
    setPicked(value);
    const d = parseDate(value);
    setMonth({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }, [visible, value]);

  const today = toDateString(new Date());
  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });

  return (
    <AppModal
      visible={visible}
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: '선택', onPress: () => onSelect(picked) },
      ]}
    >
      <View style={styles.monthRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="이전 달">
          <Ionicons name="chevron-back" size={20} color={colors.inkSoft} />
        </Pressable>
        <Txt variant="title">
          {month.y}년 {month.m}월
        </Txt>
        <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="다음 달">
          <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS_KO.map((w, i) => (
          <Txt key={w} variant="tiny" color={i === 0 ? colors.danger : colors.muted} style={styles.cell} align="center">
            {w}
          </Txt>
        ))}
      </View>
      {monthMatrix(month.y, month.m).map((row, r) => (
        <View key={r} style={styles.week}>
          {row.map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const date = `${month.y}-${pad(month.m)}-${pad(d)}`;
            const past = date < today;
            const on = date === picked;
            return (
              <Pressable
                key={i}
                disabled={past}
                onPress={() => setPicked(date)}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: past }}
              >
                <View style={[styles.day, on && styles.dayOn]}>
                  <Txt
                    variant="caption"
                    weight={on ? 'semibold' : 'regular'}
                    color={on ? colors.canvas : past ? colors.placeholder : i === 0 ? colors.danger : colors.ink}
                  >
                    {d}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </AppModal>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 10, 20, 30, 40, 50];

/** 시·분(10분 단위) 고르기 */
export function TimePickerModal(props: { visible: boolean; value: string; onClose: () => void; onSelect: (time: string) => void }) {
  const { visible, value, onClose, onSelect } = props;
  const [h0, m0] = value.split(':').map(Number);
  const [hour, setHour] = useState(h0);
  const [minute, setMinute] = useState(m0);
  useEffect(() => {
    if (!visible) return;
    setHour(h0);
    setMinute(m0);
  }, [visible, h0, m0]);

  const column = (items: number[], current: number, set: (n: number) => void, unit: string) => (
    <ScrollView style={styles.column} contentContainerStyle={styles.columnContent}>
      {items.map((n) => (
        <Pressable key={n} onPress={() => set(n)} style={[styles.option, n === current && styles.optionOn]}>
          <Txt weight={n === current ? 'semibold' : 'regular'} color={n === current ? colors.canvas : colors.ink}>
            {pad(n)}
            {unit}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );

  const time = `${pad(hour)}:${pad(minute)}`;
  return (
    <AppModal
      visible={visible}
      title="예식 시간"
      message={formatKoreanTime(time)}
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: '선택', onPress: () => onSelect(time) },
      ]}
    >
      <View style={styles.columns}>
        {column(HOURS, hour, setHour, '시')}
        {column(MINUTES, minute, setMinute, '분')}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.brand },
  columns: { flexDirection: 'row', gap: spacing.sm, height: 220 },
  column: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.sm },
  columnContent: { padding: spacing.xs, gap: 2 },
  option: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
  optionOn: { backgroundColor: colors.brand },
});
