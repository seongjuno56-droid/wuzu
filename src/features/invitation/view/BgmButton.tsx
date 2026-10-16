import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BgmInfo } from '../model';

/**
 * 초대장 오른쪽 위 음소거 버튼. 브라우저·OS 자동재생 제한 때문에
 * 처음에는 꺼진 상태로 두고, 누르면 반복 재생한다.
 */
export function BgmButton({ bgm }: { bgm: BgmInfo }) {
  const player = useAudioPlayer(bgm.uri ? { uri: bgm.uri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  const dark = bgm.muteColor === 'black';
  const toggle = () => (status.playing ? player.pause() : player.play());

  return (
    <Pressable
      onPress={toggle}
      style={[styles.button, { backgroundColor: dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)' }]}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? '배경음악 끄기' : '배경음악 켜기'}
    >
      <Ionicons name={status.playing ? 'volume-high' : 'volume-mute'} size={18} color={dark ? '#fff' : '#111'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
