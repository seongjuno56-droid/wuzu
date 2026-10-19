import { useEffect, useState } from 'react';

import { AppModal } from '../../components/AppModal';
import { TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import { invitationService } from '../../services';
import { colors } from '../../theme';
import { Invitation, isValidInvitationName, LIMITS } from '../invitation/model';

/** 초대장 이름 수정: 1~30자, 1자 이상이면 [수정하기] */
export function RenameModal({
  invitation,
  onClose,
  onRenamed,
}: {
  invitation: Invitation | null;
  onClose: () => void;
  onRenamed: (inv: Invitation) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (invitation) setName(invitation.name);
  }, [invitation]);
  const max = LIMITS.invitationName.max;
  const valid = isValidInvitationName(name);

  const submit = async () => {
    if (!invitation || !valid || saving) return;
    setSaving(true);
    try {
      const r = await invitationService.rename(invitation.id, name);
      toast('수정이 완료되었습니다.');
      onRenamed(r);
    } catch {
      toast('수정하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      visible={!!invitation}
      title="초대장 이름 수정"
      onDismiss={onClose}
      actions={[
        { label: '취소', variant: 'outline', onPress: onClose },
        { label: saving ? '수정 중…' : '수정하기', variant: valid ? 'primary' : 'secondary', onPress: submit },
      ]}
    >
      <TextField placeholder="초대장 이름을 입력하세요." value={name} onChangeText={setName} maxLength={max} />
      <Txt variant="tiny" color={name.length === 0 ? colors.danger : colors.faint} align="right">
        ({name.length}/{max})
      </Txt>
    </AppModal>
  );
}
