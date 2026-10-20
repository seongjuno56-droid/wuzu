import { useState } from 'react';

import { AppModal } from '../../../components/AppModal';
import { TextArea } from '../../../components/TextArea';
import { CANVAS_LIMITS } from '../model';

/** 텍스트 추가·수정 (최대 100자, 줄바꿈 가능) */
export function TextEditModal({
  visible,
  initial,
  onDone,
  onCancel,
}: {
  visible: boolean;
  initial: string;
  onDone: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  // 모달이 열릴 때 처음 값으로 맞춘다 (렌더 중 이전 값 비교)
  const [synced, setSynced] = useState({ visible, initial });
  if (synced.visible !== visible || synced.initial !== initial) {
    setSynced({ visible, initial });
    if (visible) setText(initial);
  }
  return (
    <AppModal
      visible={visible}
      title="텍스트"
      onDismiss={onCancel}
      actions={[
        { label: '취소', variant: 'outline', onPress: onCancel },
        { label: '확인', onPress: () => (text.trim() ? onDone(text) : onCancel()) },
      ]}
    >
      <TextArea value={text} onChangeText={setText} maxLength={CANVAS_LIMITS.text} placeholder="내용을 입력해 주세요" />
    </AppModal>
  );
}
