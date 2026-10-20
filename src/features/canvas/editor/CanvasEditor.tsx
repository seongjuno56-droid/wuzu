import { View } from 'react-native';

import { Button } from '../../../components/Button';
import type { TemplateStyle } from '../../../data/templates';
import type { InvitationContent } from '../../invitation/model';
import type { CanvasDoc } from '../types';

export interface CanvasEditorProps {
  initial: CanvasDoc;
  content: InvitationContent;
  style: TemplateStyle;
  onDone: (doc: CanvasDoc) => void;
  onCancel: () => void;
  /** 연결 텍스트 수정 시 [기본정보 열기] */
  onOpenBasic: () => void;
}

/** 캔버스 편집기 — 다음 작업에서 구현. 지금은 [완료]만 있는 빈 화면 */
export function CanvasEditor({ initial, onDone }: CanvasEditorProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button label="완료" onPress={() => onDone(initial)} />
    </View>
  );
}
