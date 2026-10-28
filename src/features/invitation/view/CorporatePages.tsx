import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { toast } from '../../../components/Toast';
import { radius, spacing } from '../../../theme';
import { CorporateContent, ProgramItem } from '../model';
import { CeremonyPage, MapCard } from './CeremonyPage';
import { IText, Page, PageTitle, useLook } from './look';

/** 기업 하객 화면 장 — 행사 개요·프로그램·연사·오시는 길·문의처 (설계 4장) */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <IText size={13} tone="sub">
        {label}
      </IText>
      <IText raw>{value}</IText>
    </View>
  );
}

/** 행사 개요: 일시·장소(공통, 지도 없이) + 대상·드레스코드 */
export function CorporateOverviewPage({ content }: { content: CorporateContent }) {
  const { ceremony } = content;
  const audience = ceremony.audience.trim();
  const dress = ceremony.dressCode.trim();
  return (
    <CeremonyPage
      ceremony={ceremony}
      showMap={false}
      placeTitle="장소"
      venuePlaceholder="장소 이름"
      ddayText={(n) => `행사까지 ${n}일 남았습니다.`}
      todayText="오늘은 행사 당일이에요"
    >
      {(!!audience || !!dress) && (
        <View style={styles.infos}>
          {!!audience && <InfoRow label="대상" value={audience} />}
          {!!dress && <InfoRow label="드레스코드" value={dress} />}
        </View>
      )}
    </CeremonyPage>
  );
}

/** 시간표 — 기업 프로그램·모임 일정표 */
export function ProgramPage({ items, title }: { items: ProgramItem[]; title: string }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>{title}</PageTitle>
      <View style={styles.table}>
        {items.map((it) => (
          <View key={it.id} style={[styles.slot, { borderColor: look.sub + '33' }]}>
            <View style={styles.time}>
              <IText size={14} tone="accent" align="left" raw>
                {it.time || '—'}
              </IText>
            </View>
            <View style={styles.flex}>
              <IText bold align="left" raw>
                {it.title}
              </IText>
              {!!it.detail.trim() && (
                <IText size={14} tone="sub" align="left" raw>
                  {it.detail}
                </IText>
              )}
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 연사 소개: 카드 목록 */
export function SpeakersPage({ content }: { content: CorporateContent }) {
  const look = useLook();
  return (
    <Page>
      <PageTitle>연사 소개</PageTitle>
      <View style={styles.cards}>
        {content.speakers.items.map((s) => (
          <View key={s.id} style={[styles.card, { borderColor: look.sub + '33' }]}>
            {s.photo ? (
              // key 를 주소로 — 사진을 바꾸면 깨진 표시가 남지 않게 새로 그린다
              <Image key={s.photo} source={{ uri: s.photo }} style={styles.face} resizeMode="cover" />
            ) : (
              <View style={[styles.face, { backgroundColor: look.sub + '22' }]} />
            )}
            <View style={styles.flex}>
              <IText bold align="left" raw>
                {s.name}
              </IText>
              {!!s.title.trim() && (
                <IText size={13} tone="sub" align="left" raw>
                  {s.title}
                </IText>
              )}
              {!!s.line.trim() && (
                <IText size={14} align="left" raw>
                  {s.line}
                </IText>
              )}
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 오시는 길: 지도(공통 틀) + 주차·대중교통 */
export function DirectionsPage({ content }: { content: CorporateContent }) {
  const { ceremony: e, directions: d } = content;
  const address = [e.address, e.addressDetail].filter(Boolean).join(' ');
  return (
    <Page>
      <PageTitle>오시는 길</PageTitle>
      <IText bold raw={!!e.venue}>
        {[e.venue || '장소 이름', e.hall].filter(Boolean).join(', ')}
      </IText>
      {e.mapMode === 'use' &&
        (e.addressMode === 'search' ? (
          <MapCard address={address} venue={e.venue} />
        ) : (
          e.mapImages.map((uri) => <Image key={uri} source={{ uri }} style={styles.mapImage} resizeMode="cover" />)
        ))}
      <View style={styles.infos}>
        {!!d.parking.trim() && <InfoRow label="주차" value={d.parking} />}
        {!!d.transit.trim() && <InfoRow label="대중교통" value={d.transit} />}
      </View>
    </Page>
  );
}

/** 문의처: 누르면 전화·메일 */
export function ContactPage({ content }: { content: CorporateContent }) {
  const look = useLook();
  const k = content.contact;
  const button = (label: string, a11y: string, url: string) => (
    <Pressable
      // 전화·메일 앱이 없는 기기에서는 열기가 실패한다 — 연락처는 화면에 그대로 보이므로 안내만
      onPress={() => Linking.openURL(url).catch(() => toast('앱을 열 수 없어요. 연락처를 직접 입력해 주세요.'))}
      style={[styles.contactBtn, { borderColor: look.sub + '55' }]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <IText size={14} raw>
        {label}
      </IText>
    </Pressable>
  );
  return (
    <Page>
      <PageTitle>문의처</PageTitle>
      <IText bold raw>
        {k.name}
      </IText>
      <View style={styles.contactRow}>
        {!!k.phone.trim() && button(k.phone, '전화 걸기', `tel:${k.phone.replace(/-/g, '')}`)}
        {!!k.email.trim() && button(k.email, '메일 보내기', `mailto:${k.email.trim()}`)}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infos: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.lg },
  infoRow: { gap: 2, alignItems: 'center' },
  table: { alignSelf: 'stretch' },
  slot: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  time: { width: 56 },
  cards: { alignSelf: 'stretch', gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  face: { width: 64, height: 64, borderRadius: 32 },
  mapImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm },
  contactRow: { gap: spacing.sm, alignSelf: 'stretch' },
  contactBtn: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center' },
});
