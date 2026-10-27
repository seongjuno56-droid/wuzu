import { describe, expect, it } from 'vitest';
import { summarizeChange } from '../format';

describe('summarizeChange', () => {
  it('바뀐 칸만 한국어 이름으로 before → after', () => {
    expect(summarizeChange({ status: 'active' }, { status: 'banned' })).toBe('상태: active → banned');
    expect(summarizeChange({ active: true }, { active: false })).toBe('활성: 예 → 아니오');
    expect(summarizeChange({ banned: false, x: 1 }, { banned: true, x: 1 })).toBe('숨김: 아니오 → 예');
  });

  it('before 가 없으면(추가) after 값만', () => {
    expect(summarizeChange(null, { email: 'a@wuzu.kr', name: '가' })).toBe('이메일: a@wuzu.kr, 이름: 가');
  });

  it('둘 다 없으면 빈 글자, 객체가 아니면 값 그대로', () => {
    expect(summarizeChange(null, null)).toBe('');
    expect(summarizeChange(1, 2)).toBe('1 → 2');
    expect(summarizeChange({ k: [1] }, null)).toBe('k: [1] → 없음');
  });
});
