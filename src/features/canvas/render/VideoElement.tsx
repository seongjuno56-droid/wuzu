import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import { BrokenMedia } from './BrokenMedia';

/** 소리 없이 자동 반복 재생 (하객 화면에는 BGM 이 따로 있다) */
export function VideoElement({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  if (status === 'error') return <BrokenMedia width={width} height={height} />;
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
      {...({ playsInline: true } as object)}
    />
  );
}
