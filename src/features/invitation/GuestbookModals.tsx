import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { TextArea } from '../../components/TextArea';
import { TextField } from '../../components/TextField';
import { toast, ToastHost } from '../../components/Toast';
import { Txt } from '../../components/Txt';
import type { GuestbookEntry, GuestbookInput } from '../../services/types';
import { colors, spacing } from '../../theme';
import { LIMITS, validateGuestbookEntry } from './model';

export type GuestbookView = 'write' | 'all' | null;

interface Props {
  view: GuestbookView;
  onChangeView: (view: GuestbookView) => void;
  entries: GuestbookEntry[];
  /** 초대장 작성자 본인이면 비밀번호 없이 삭제 */
  isOwner: boolean;
  onAdd: (input: GuestbookInput) => Promise<void>;
  onRemove: (entry: GuestbookEntry, password: string | null) => Promise<'ok' | 'wrong_password' | 'not_found'>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Txt variant="title" style={styles.flex}>
            {title}
          </Txt>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="닫기">
            <Ionicons name="close" size={26} color={colors.inkSoft} />
          </Pressable>
        </View>
        {children}
        {/* 전체 화면 모달은 앱의 토스트를 가리므로 모달 안에서도 띄운다 */}
        <ToastHost />
      </SafeAreaView>
    </Modal>
  );
}

function WriteSheet({ onClose, onAdd }: { onClose: () => void; onAdd: Props['onAdd'] }) {
  const g = LIMITS.guestbook;
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = validateGuestbookEntry({ name, password, content }).length === 0;

  const submit = async () => {
    setBusy(true);
    try {
      await onAdd({ name, password, content });
      toast('방명록이 등록되었습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="방명록 작성" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Txt variant="caption" color={colors.muted} align="center">
          초대장을 받은 모든 사용자가 내용을 확인할 수 있어요.{'\n'}좋은 표현으로 가득 채워주세요.
        </Txt>
        <View>
          <TextField label="이름" required placeholder="이름을 입력하세요." value={name} onChangeText={setName} maxLength={g.name} />
          <Txt variant="tiny" color={colors.faint} align="right">
            ({name.length}/{g.name})
          </Txt>
        </View>
        <TextField
          label="비밀번호"
          required
          placeholder={`비밀번호를 입력해주세요. (${g.passwordMin}~${g.passwordMax}자)`}
          value={password}
          onChangeText={setPassword}
          secureToggle
          maxLength={g.passwordMax}
        />
        <TextArea
          label="내용"
          required
          value={content}
          onChangeText={setContent}
          maxLength={g.content}
          placeholder="내용을 작성해주세요."
          minHeight={180}
        />
        <Button label="방명록 남기기" disabled={!valid} loading={busy} onPress={submit} />
      </ScrollView>
    </Sheet>
  );
}

function AllSheet({ onClose, entries, isOwner, onRemove }: Omit<Props, 'view' | 'onChangeView' | 'onAdd'> & { onClose: () => void }) {
  const [target, setTarget] = useState<GuestbookEntry | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTarget(null);
    setPassword('');
    setError(null);
  };
  const remove = async () => {
    if (!target) return;
    const result = await onRemove(target, isOwner ? null : password);
    if (result === 'wrong_password') {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    close();
    toast('삭제가 완료되었습니다.');
  };

  return (
    <Sheet title="방명록 전체보기" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="caption" color={colors.muted} align="center">
          초대장을 받은 모든 사용자가 내용을 열람할 수 있어요.
        </Txt>
        {entries.length === 0 && (
          <Txt color={colors.faint} align="center" style={styles.empty}>
            아직 남겨진 방명록이 없어요.
          </Txt>
        )}
        {entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Txt variant="bodyStrong" style={styles.flex}>
                {e.name}
              </Txt>
              <Pressable
                onPress={() => setTarget(e)}
                hitSlop={8}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel={`${e.name}님의 방명록 삭제`}
              >
                <Ionicons name="close" size={14} color={colors.muted} />
              </Pressable>
            </View>
            <Txt color={colors.label}>{e.content}</Txt>
          </View>
        ))}
      </ScrollView>

      {/* 작성자 본인: 확인만 / 그 외: 비밀번호 확인 */}
      <AppModal
        visible={!!target && isOwner}
        title="방명록을 삭제하시겠습니까?"
        onDismiss={close}
        actions={[
          { label: '닫기', variant: 'outline', onPress: close },
          { label: '삭제', onPress: remove },
        ]}
      />
      <AppModal
        visible={!!target && !isOwner}
        title="방명록 삭제"
        onDismiss={close}
        actions={[
          { label: '닫기', variant: 'outline', onPress: close },
          { label: '확인', onPress: password.length >= LIMITS.guestbook.passwordMin ? remove : () => {} },
        ]}
      >
        <TextField
          placeholder="비밀번호를 입력하세요."
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          secureToggle
          maxLength={LIMITS.guestbook.passwordMax}
          message={error ? { type: 'error', text: error } : null}
        />
      </AppModal>
    </Sheet>
  );
}

/** 방명록 작성 / 전체보기 / 삭제 — 미리보기와 실제 초대장이 같이 쓴다 */
export function GuestbookModals({ view, onChangeView, entries, isOwner, onAdd, onRemove }: Props) {
  if (view === 'write')
    return (
      <WriteSheet
        onClose={() => onChangeView(null)}
        onAdd={async (input) => {
          await onAdd(input);
          onChangeView('all');
        }}
      />
    );
  if (view === 'all')
    return <AllSheet onClose={() => onChangeView(null)} entries={entries} isOwner={isOwner} onRemove={onRemove} />;
  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { flex: 1, backgroundColor: colors.canvas },
  sheetHead: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  body: { padding: spacing.xl, gap: spacing.lg },
  empty: { paddingVertical: spacing.xxxl },
  entry: { gap: spacing.sm, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  entryHead: { flexDirection: 'row', alignItems: 'center' },
  remove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
