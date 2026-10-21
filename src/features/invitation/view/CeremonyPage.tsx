import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { useLocale } from '../../../i18n';
import { radius, spacing } from '../../../theme';
import {
  CeremonyInfo,
  ddayParts,
  formatCountdown,
  formatWeekdayTime,
  monthMatrix,
  parseDate,
  weekdayNames,
} from '../model';
import { IText, Page, PageTitle, useLook } from './look';

function Calendar({ date }: { date: Date }) {
  const look = useLook();
  useLocale((s) => s.locale); // 요일 머리글이 언어를 따르도록
  const rows = monthMatrix(date.getFullYear(), date.getMonth() + 1);
  return (
    <View style={styles.calendar}>
      <View style={styles.week}>
        {weekdayNames().map((w, i) => (
          <View key={w} style={styles.day}>
            <IText size={13} tone={i === 0 ? 'accent' : 'sub'}>
              {w}
            </IText>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.week}>
          {row.map((d, i) => {
            const isDay = d === date.getDate();
            return (
              <View key={i} style={styles.day}>
                {d && (
                  <View style={[styles.dayInner, isDay && { backgroundColor: look.accent }]}>
                    <IText
                      size={14}
                      bold={isDay}
                      tone={i === 0 ? 'accent' : 'fg'}
                      style={isDay ? { color: '#fff' } : undefined}
                    >
                      {d}
                    </IText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** D-Day: 1초마다 남은 시간 갱신 */
function Dday({ target }: { target: Date }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = ddayParts(target, now);
  return (
    <View style={styles.dday}>
      <IText size={14} bold>
        D-Day
      </IText>
      {d.past ? (
        <IText size={18}>결혼식 당일이에요</IText>
      ) : (
        <>
          <IText size={20}>
            {formatCountdown(d)}
          </IText>
          <IText size={14} tone="sub">
            {`결혼식까지 ${d.daysLeft}일 남았습니다.`}
          </IText>
        </>
      )}
    </View>
  );
}

/** 지도 SDK 키가 없어 주소 카드 + 지도 앱 링크로 대신한다 */
function MapCard({ address, venue }: { address: string; venue: string }) {
  const look = useLook();
  const q = encodeURIComponent(address || venue);
  return (
    <View style={[styles.map, { borderColor: look.sub + '44' }]}>
      <Ionicons name="location" size={28} color={look.accent} />
      <IText size={14} tone="sub" raw={!!address}>
        {address || '주소를 입력하면 여기에 보여요.'}
      </IText>
      <View style={styles.mapLinks}>
        <Pressable
          style={[styles.mapButton, { borderColor: look.sub + '55' }]}
          onPress={() => Linking.openURL(`https://map.kakao.com/?q=${q}`)}
        >
          <IText size={13}>카카오맵</IText>
        </Pressable>
        <Pressable
          style={[styles.mapButton, { borderColor: look.sub + '55' }]}
          onPress={() => Linking.openURL(`https://map.naver.com/p/search/${q}`)}
        >
          <IText size={13}>네이버지도</IText>
        </Pressable>
      </View>
    </View>
  );
}

export function CeremonyPage({ ceremony }: { ceremony: CeremonyInfo }) {
  useLocale((s) => s.locale); // 요일·시간 줄이 언어를 따르도록
  const date = parseDate(ceremony.date);
  const [h, m] = ceremony.time.split(':').map(Number);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h || 0, m || 0);
  const address = [ceremony.address, ceremony.addressDetail].filter(Boolean).join(' ');

  return (
    <Page>
      <IText size={24}>
        {date.getFullYear()} / {date.getMonth() + 1} / {date.getDate()}
      </IText>
      <IText tone="sub">
        {formatWeekdayTime(date, ceremony.time)}
      </IText>
      {ceremony.showCalendar && <Calendar date={date} />}
      {ceremony.showDday && <Dday target={target} />}

      <View style={styles.venue}>
        <PageTitle>예식 장소</PageTitle>
        <IText bold raw={!!ceremony.venue}>{[ceremony.venue || '예식장 이름', ceremony.hall].filter(Boolean).join(', ')}</IText>
        {!!address && <IText tone="sub" raw>{address}</IText>}
      </View>

      {ceremony.mapMode === 'use' &&
        (ceremony.addressMode === 'search' ? (
          <MapCard address={address} venue={ceremony.venue} />
        ) : (
          ceremony.mapImages.map((uri) => <Image key={uri} source={{ uri }} style={styles.mapImage} resizeMode="cover" />)
        ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  calendar: { alignSelf: 'stretch', paddingHorizontal: spacing.sm, gap: 2, marginTop: spacing.sm },
  week: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dday: { alignItems: 'center', gap: 2, marginTop: spacing.lg },
  venue: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxl },
  map: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  mapLinks: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  mapButton: { borderWidth: 1, borderRadius: radius.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  mapImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm },
});
