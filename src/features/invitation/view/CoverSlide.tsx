import { styleFor } from '../../../data/templates';
import { coverPreset } from '../../canvas/preset';
import { CanvasSlide } from '../../canvas/render/CanvasSlide';
import type { Invitation } from '../model';

/** 표지: 캔버스로 꾸몄으면 그 문서, 아니면 템플릿 프리셋 */
export function CoverSlide({
  invitation,
  width,
}: {
  invitation: Pick<Invitation, 'themeId' | 'templateId' | 'paletteId' | 'content' | 'design'>;
  width: number;
}) {
  const style = styleFor(invitation.themeId, invitation.templateId, invitation.paletteId);
  const design = invitation.design.cover;
  const doc = design?.mode === 'canvas' ? design.canvas : coverPreset(style);
  return <CanvasSlide doc={doc} content={invitation.content} templateBg={style.bg} width={width} />;
}
