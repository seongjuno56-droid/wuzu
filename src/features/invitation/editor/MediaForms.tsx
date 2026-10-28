import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../../../components/Button';
import { OptionGroup } from '../../../components/OptionGroup';
import { TextArea } from '../../../components/TextArea';
import { Txt } from '../../../components/Txt';
import { colors, radius, spacing } from '../../../theme';
import { useEditor } from '../editorStore';
import { pickAudio } from '../media';
import { LIMITS, withGallery } from '../model';
import { themeDef } from '../themes';
import { Check, FormLabel, Hint, PhotoSlots } from './fields';

const useContent = () => useEditor((s) => s.draft!.content);
const usePatch = () => useEditor((s) => s.patch);

/** 갤러리: 스와이프/그리드, 그리드 배치·더보기, 사진 4~12장 */
export function GalleryForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const g = withGallery(useContent()).gallery;
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <View style={styles.group}>
        <FormLabel>스타일 선택</FormLabel>
        <OptionGroup
          value={g.style}
          onChange={(style) => patch('gallery', { style })}
          options={[
            { value: 'swipe', label: '스와이프' },
            { value: 'grid', label: '그리드' },
          ]}
        />
      </View>
      {g.style === 'grid' && (
        <>
          <View style={styles.group}>
            <FormLabel>배치 옵션</FormLabel>
            <OptionGroup
              value={String(g.columns) as '2' | '3'}
              onChange={(v) => patch('gallery', { columns: Number(v) as 2 | 3 })}
              options={[
                { value: '2', label: '2단' },
                { value: '3', label: '3단' },
              ]}
            />
          </View>
          <View style={styles.group}>
            <FormLabel>더보기 옵션</FormLabel>
            <Check label="사용 (4번째 줄부터 접기)" value={g.collapse} onChange={(collapse) => patch('gallery', { collapse })} />
          </View>
        </>
      )}
      <View style={styles.group}>
        <FormLabel required>사진</FormLabel>
        <Hint>
          최소 {LIMITS.galleryMin}장 이상, 최대 {LIMITS.galleryMax}장까지 등록할 수 있어요. 사진 왼쪽 위 아이콘을 끌어 순서를 바꿀 수 있어요.
        </Hint>
        <PhotoSlots
          photos={g.photos}
          onChange={(photos) => patch('gallery', { photos })}
          max={LIMITS.galleryMax}
          minCount={LIMITS.galleryMin}
          onDragChange={onDragChange}
        />
      </View>
    </View>
  );
}

/** 엔딩: 스타일, 내용(필수, 기본 문구), 사진 최대 3장 */
export function EndingForm({ onDragChange }: { onDragChange?: (dragging: boolean) => void }) {
  const e = useContent().ending;
  const themeId = useEditor((s) => s.draft!.themeId);
  const patch = usePatch();
  return (
    <View style={styles.form}>
      <View style={styles.group}>
        <FormLabel>스타일 선택</FormLabel>
        <OptionGroup
          value={String(e.style) as '1' | '2'}
          onChange={(v) => patch('ending', { style: Number(v) as 1 | 2 })}
          options={[
            { value: '1', label: '스타일1 (사진+문구)' },
            { value: '2', label: '스타일2 (사진 위 문구)' },
          ]}
        />
      </View>
      <TextArea
        label="내용"
        required
        value={e.content}
        onChangeText={(content) => patch('ending', { content })}
        maxLength={LIMITS.ending}
        placeholder="내용을 입력하세요."
        invalid={!e.content.trim()}
        minHeight={96}
        right={
          <Pressable onPress={() => patch('ending', { content: themeDef(themeId).defaultEnding() })} hitSlop={6}>
            <Txt variant="tiny" color={colors.infoInk}>
              기본 문구 넣기
            </Txt>
          </Pressable>
        }
      />
      <View style={styles.group}>
        <FormLabel>사진</FormLabel>
        <Hint>최대 {LIMITS.endingPhotos}장까지 등록할 수 있어요. 끌어서 순서를 바꿀 수 있어요.</Hint>
        <PhotoSlots photos={e.photos} onChange={(photos) => patch('ending', { photos })} max={LIMITS.endingPhotos} onDragChange={onDragChange} />
      </View>
    </View>
  );
}

/** BGM: 업로드(MP3·M4A·AAC·WAV·OGG, 5MB), 재생·일시정지·정지·삭제, 음소거 버튼 색상 */
export function BgmForm() {
  const bgm = useContent().bgm;
  const patch = usePatch();
  const player = useAudioPlayer(bgm.uri ? { uri: bgm.uri } : null);
  const status = useAudioPlayerStatus(player);

  const upload = async () => {
    const file = await pickAudio();
    if (file) patch('bgm', { uri: file.uri, fileName: file.name });
  };
  const stop = async () => {
    player.pause();
    await player.seekTo(0);
  };
  const remove = async () => {
    await stop();
    patch('bgm', { uri: null, fileName: null });
  };
  const control = (icon: 'play' | 'pause' | 'stop' | 'close', label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!bgm.uri}
      style={[styles.control, !bgm.uri && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={colors.inkSoft} />
    </Pressable>
  );

  return (
    <View style={styles.form}>
      <View style={styles.group}>
        <FormLabel required>BGM 선택</FormLabel>
        <Hint>지원하는 확장자: MP3, M4A, AAC, WAV, OGG · 5MB 이하</Hint>
        <View style={styles.fileRow}>
          <Button label="업로드" variant="outline" size="sm" onPress={upload} />
          <Txt variant="caption" color={bgm.fileName ? colors.ink : colors.faint} style={styles.flex} numberOfLines={1}>
            {bgm.fileName ?? '등록된 파일이 없습니다.'}
          </Txt>
        </View>
        <View style={styles.controls}>
          {control(status.playing ? 'pause' : 'play', status.playing ? '일시정지' : '재생', () =>
            status.playing ? player.pause() : player.play(),
          )}
          {control('stop', '정지', stop)}
          {control('close', '파일 삭제', remove)}
        </View>
      </View>
      <View style={styles.group}>
        <FormLabel>음소거 버튼 색상</FormLabel>
        <OptionGroup
          value={bgm.muteColor}
          onChange={(muteColor) => patch('bgm', { muteColor })}
          options={[
            { value: 'black', label: '블랙' },
            { value: 'white', label: '화이트' },
          ]}
        />
        <Hint>초대장 배경에 버튼이 묻히지 않는 색을 골라주세요.</Hint>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.xl },
  group: { gap: spacing.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  controls: { flexDirection: 'row', gap: spacing.sm },
  control: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
