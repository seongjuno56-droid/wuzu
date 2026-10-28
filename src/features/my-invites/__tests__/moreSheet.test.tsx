import { press, render } from '../../../test/ui';
import { createInvitation } from '../../invitation/themes';
import { MoreSheet } from '../MoreSheet';

// 표지 썸네일은 영상 모듈까지 불러와 테스트 환경에서 못 그린다
jest.mock('../CoverThumb', () => ({ CoverThumb: () => null }));

const now = new Date(2026, 9, 26);
const inv = (themeId: string) => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId, templateId: `${themeId}-1`, today: now }),
  status: 'final' as const,
});

describe('더보기 — 참석 응답', () => {
  it('모임은 더보기에 참석 응답 (N)', () => {
    const onSelect = jest.fn();
    const ui = render(
      <MoreSheet visible invitation={inv('meetup')} rsvpCount={2} onSelect={onSelect} onClose={() => {}} />,
    );
    press(ui.getText('참석 응답 (2)'));
    expect(onSelect).toHaveBeenCalledWith('rsvp');
  });
  it('결혼식·기업은 더보기에 없음', () => {
    for (const t of ['wedding', 'corporate']) {
      const ui = render(<MoreSheet visible invitation={inv(t)} onSelect={() => {}} onClose={() => {}} />);
      expect(ui.queryText('참석 응답 (0)')).toBeNull();
    }
  });
});
