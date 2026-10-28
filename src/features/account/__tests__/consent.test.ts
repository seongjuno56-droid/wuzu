import { nextPushOnMarketing } from '../consent';

describe('마케팅 ↔ PUSH', () => {
  it('마케팅 켜면 PUSH 켜짐, 끄면 PUSH 꺼짐', () => {
    expect(nextPushOnMarketing(true, 'declined')).toBe('agreed');
    expect(nextPushOnMarketing(false, 'agreed')).toBe('declined');
  });
});
