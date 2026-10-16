import { Image, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../theme';
import { EndingInfo } from '../model';
import { IText, Page } from './look';

/** 스타일1: 사진 위·문구 아래 / 스타일2: 첫 사진 위에 문구를 얹은 풀블리드 */
export function EndingPage({ ending }: { ending: EndingInfo }) {
  const [first, ...rest] = ending.photos;

  if (ending.style === 2 && first) {
    return (
      <View style={styles.hero}>
        <Image source={{ uri: first }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.shade} />
        <IText size={17} bold style={styles.onPhoto}>
          {ending.content}
        </IText>
      </View>
    );
  }

  return (
    <Page style={styles.page}>
      {ending.photos.length > 0 && (
        <View style={styles.photos}>
          {[first, ...rest].map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} resizeMode="cover" />
          ))}
        </View>
      )}
      <IText size={16}>{ending.content}</IText>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 96 },
  photos: { alignSelf: 'stretch', gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.sm },
  hero: { aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'flex-end', padding: spacing.xxl, paddingBottom: 64 },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  onPhoto: { color: '#fff' },
});
