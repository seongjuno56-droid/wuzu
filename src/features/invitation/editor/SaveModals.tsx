import { useState } from 'react';

import { AppModal } from '../../../components/AppModal';
import { TextField } from '../../../components/TextField';
import { Txt } from '../../../components/Txt';
import { colors } from '../../../theme';
import { isValidInvitationName, LIMITS } from '../model';

/** 초대장 저장 / 임시저장: 이름 1~30자 입력 */
export function SaveNameModal(props: {
  visible: boolean;
  kind: 'draft' | 'final';
  initialName: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const { visible, kind, initialName, saving, onCancel, onSave } = props;
  const [name, setName] = useState(initialName);
  // 모달이 열릴 때(또는 초기 이름이 바뀔 때) 입력값을 맞춘다
  const [synced, setSynced] = useState({ visible, initialName });
  if (synced.visible !== visible || synced.initialName !== initialName) {
    setSynced({ visible, initialName });
    if (visible) setName(initialName);
  }
  const valid = isValidInvitationName(name);
  const max = LIMITS.invitationName.max;

  return (
    <AppModal
      visible={visible}
      title={kind === 'final' ? '초대장 저장' : '초대장 임시저장'}
      onDismiss={onCancel}
      actions={[
        { label: '취소', variant: 'outline', onPress: onCancel },
        { label: saving ? '저장 중…' : '저장', onPress: () => valid && !saving && onSave(name.trim()) },
      ]}
    >
      <TextField
        placeholder="초대장 이름을 입력하세요."
        value={name}
        onChangeText={setName}
        maxLength={max}
        message={name && !valid ? { type: 'error', text: `${LIMITS.invitationName.min}~${max}자로 입력해 주세요.` } : null}
      />
      <Txt variant="tiny" color={colors.faint} align="right">
        ({name.length}/{max})
      </Txt>
      {kind === 'final' && (
        <Txt variant="tiny" color={colors.muted} align="center">
          저장 후 나의 초대장에서 활성화하면 링크로 보낼 수 있어요.
        </Txt>
      )}
    </AppModal>
  );
}

/** 저장 완료: 메인으로 / 나의 초대장으로 이동 */
export function SavedModal(props: { visible: boolean; onHome: () => void; onMyInvites: () => void }) {
  return (
    <AppModal
      visible={props.visible}
      title="저장이 완료되었습니다."
      actions={[
        { label: '메인으로', variant: 'outline', onPress: props.onHome },
        { label: '나의 초대장으로 이동', onPress: props.onMyInvites },
      ]}
    />
  );
}
