import { press, render } from '../../../test/ui';
import type { Invitation } from '../../invitation/model';
import { createInvitation } from '../../invitation/themes';
import { InviteCard } from '../InviteCard';

// 표지 썸네일은 영상 모듈까지 불러와 테스트 환경에서 못 그린다 — 카드 버튼만 본다
jest.mock('../CoverThumb', () => ({ CoverThumb: () => null }));

const now = new Date(2026, 9, 25);
const card = (themeId: string): Invitation => ({
  ...createInvitation({ id: 'i', ownerId: 'u', themeId, templateId: `${themeId}-1`, today: now }),
  status: 'final',
});

describe('나의 초대장 카드 — 참석 응답', () => {
  it('기업 초대장은 방명록 대신 [참석 응답 (N)]', () => {
    const onAction = jest.fn();
    const ui = render(
      <InviteCard invitation={card('corporate')} now={now} hasNew={false} rsvpCount={3} onAction={onAction} />,
    );
    expect(ui.queryText('방명록')).toBeNull();
    press(ui.getText('참석 응답 (3)'));
    expect(onAction).toHaveBeenCalledWith('rsvp');
  });
  it('결혼식 카드는 그대로 방명록', () => {
    const ui = render(<InviteCard invitation={card('wedding')} now={now} hasNew={false} onAction={jest.fn()} />);
    expect(ui.getText('방명록')).toBeTruthy();
    expect(ui.queryText('참석 응답 (0)')).toBeNull();
  });
});

describe('공유하기 버튼', () => {
  const active = (slug?: string): Invitation => ({
    ...card('wedding'),
    activatedAt: new Date(2026, 9, 20).toISOString(),
    expiresAt: new Date(2026, 10, 20).toISOString(),
    slug,
  });
  it('slug 가 없으면 공유 버튼이 없다', () => {
    const ui = render(<InviteCard invitation={active()} now={now} hasNew={false} onAction={jest.fn()} />);
    expect(ui.queryText('공유하기')).toBeNull();
    expect(ui.getText('기간 연장')).toBeTruthy();
  });
  it('활성화 중이고 slug 가 있으면 공유 버튼이 있다', () => {
    const onAction = jest.fn();
    const ui = render(<InviteCard invitation={active('abc123')} now={now} hasNew={false} onAction={onAction} />);
    press(ui.getText('공유하기'));
    expect(onAction).toHaveBeenCalledWith('share');
  });
  it('기간이 끝난 초대장은 slug 가 있어도 공유 버튼이 없다', () => {
    const expired = { ...active('abc123'), expiresAt: new Date(2026, 9, 21).toISOString() };
    const ui = render(<InviteCard invitation={expired} now={now} hasNew={false} onAction={jest.fn()} />);
    expect(ui.queryText('공유하기')).toBeNull();
  });
});

describe('참석 신청을 끈 기업 카드', () => {
  it('개수 없이 꺼진 [참석 응답] — 받은 응답이 있어도 (0) 으로 보이지 않는다', () => {
    const inv = { ...card('corporate'), enabled: { ...card('corporate').enabled, rsvp: false } };
    const ui = render(<InviteCard invitation={inv} now={now} hasNew={false} onAction={jest.fn()} />);
    expect(ui.getText('참석 응답')).toBeTruthy();
    expect(ui.queryText('참석 응답 (0)')).toBeNull();
  });
});
