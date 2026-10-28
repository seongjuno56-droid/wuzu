import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

/** 미디어를 못 불러올 때 (웹 새로고침 후 GIF·동영상 등) */
export function BrokenMedia({ width, height }: { width: number; height: number }) {
  return (
    <View
      style={{ width, height, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel="불러오지 못한 미디어"
    >
      <Ionicons name="image-outline" size={Math.max(16, Math.min(width, height) * 0.3)} color="#8A8A8A" />
    </View>
  );
}
