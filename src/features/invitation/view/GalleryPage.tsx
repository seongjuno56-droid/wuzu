import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { GalleryInfo } from '../model';
import { IText, Page, PageTitle, useLook } from './look';

const COLLAPSED_ROWS = 3; // 4번째 줄부터 더보기로 접는다

/** 사진이 아직 없을 때 자리 표시 */
function Placeholder({ style }: { style?: object }) {
  const look = useLook();
  return (
    <View style={[styles.placeholder, { backgroundColor: look.sub + '22' }, style]}>
      <Ionicons name="image-outline" size={22} color={look.sub} />
    </View>
  );
}

function Swipe({ photos }: { photos: string[] }) {
  const look = useLook();
  const [index, setIndex] = useState(0);
  const total = Math.max(photos.length, 1);
  const go = (d: number) => setIndex((i) => (i + d + total) % total);
  const current = photos[index];

  return (
    <View style={styles.full}>
      <View>
        {current ? (
          <Image source={{ uri: current }} style={styles.main} resizeMode="cover" />
        ) : (
          <Placeholder style={styles.main} />
        )}
        {photos.length > 1 && (
          <>
            <Pressable style={[styles.arrow, styles.left]} onPress={() => go(-1)} accessibilityLabel="이전 사진">
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Pressable style={[styles.arrow, styles.right]} onPress={() => go(1)} accessibilityLabel="다음 사진">
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          </>
        )}
      </View>
      <View style={styles.thumbs}>
        {(photos.length ? photos : [null, null, null]).map((p, i) => (
          <Pressable
            key={p ?? i}
            onPress={() => setIndex(i)}
            style={[styles.thumb, i === index && { borderColor: look.accent, borderWidth: 2 }]}
          >
            {p ? <Image source={{ uri: p }} style={StyleSheet.absoluteFill} /> : <Placeholder style={StyleSheet.absoluteFill} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Grid({ gallery }: { gallery: GalleryInfo }) {
  const look = useLook();
  const [open, setOpen] = useState(false);
  const cols = gallery.columns;
  const cells: (string | null)[] = gallery.photos.length ? gallery.photos : Array(cols * 2).fill(null);
  const limit = cols * COLLAPSED_ROWS;
  const collapsed = gallery.collapse && !open && cells.length > limit;
  const shown = collapsed ? cells.slice(0, limit) : cells;

  return (
    <View style={styles.full}>
      <View style={styles.grid}>
        {shown.map((p, i) => (
          <View key={p ?? i} style={[styles.cell, { width: `${100 / cols}%` }]}>
            {p ? <Image source={{ uri: p }} style={styles.cellImage} /> : <Placeholder style={styles.cellImage} />}
          </View>
        ))}
      </View>
      {collapsed && (
        <Pressable style={[styles.more, { borderColor: look.sub + '55' }]} onPress={() => setOpen(true)}>
          <IText size={14}>더보기</IText>
          <Ionicons name="chevron-down" size={14} color={look.fg} />
        </Pressable>
      )}
    </View>
  );
}

export function GalleryPage({ gallery }: { gallery: GalleryInfo }) {
  return (
    <Page>
      <PageTitle>갤러리</PageTitle>
      {gallery.style === 'swipe' ? <Swipe photos={gallery.photos} /> : <Grid gallery={gallery} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch', gap: spacing.sm },
  placeholder: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
  main: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.xs },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { left: spacing.sm },
  right: { right: spacing.sm },
  thumbs: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  thumb: { width: 56, height: 56, borderRadius: radius.xs, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
  cell: { padding: 2 },
  cellImage: { width: '100%', aspectRatio: 1, borderRadius: 2 },
  more: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.xs,
  },
});
