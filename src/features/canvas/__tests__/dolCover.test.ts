import { getTemplates } from '../../../data/templates';
import { defaultDolContent } from '../../invitation/dol';
import type { DolContent } from '../../invitation/model';
import { bindLabel, bindsFor, resolveBind, resolvePhoto } from '../model';
import { coverPreset } from '../preset';

const base = defaultDolContent(new Date(2026, 9, 22));
const c: DolContent = {
  ...base,
  basic: {
    ...base.basic,
    childName: '이시안',
    photo: 'cover.jpg',
    guardians: base.basic.guardians.map((g, i) => ({
      ...g,
      relation: ['아빠', '엄마'][i],
      name: ['이윤종', '이다영'][i],
    })),
  },
  ceremony: { ...base.ceremony, date: '2027-04-22', venue: '비비드 파티룸' },
};

describe('돌잔치 표지', () => {
  it('배치: 사진 틀(템플릿 틀) + 아이 이름 + 일시·장소 + 보호자', () => {
    const style = getTemplates('dol')[0].style;
    const doc = coverPreset(style, 'dol');
    const photo = doc.elements.find((e) => e.kind === 'photo');
    expect(photo && photo.kind === 'photo' && photo.frame).toBe(style.frame);
    const binds = doc.elements.flatMap((e) => (e.kind === 'bound' ? [e.bind] : []));
    expect(binds).toEqual(expect.arrayContaining(['childName', 'datetime', 'venue', 'guardians']));
  });
  it('결혼식 표지는 그대로 (사진 요소 없음)', () => {
    const doc = coverPreset(getTemplates('wedding')[0].style);
    expect(doc.elements.some((e) => e.kind === 'photo')).toBe(false);
  });
  it('정보 글자 값', () => {
    expect(resolveBind('childName', c).text).toBe('이시안');
    expect(resolveBind('nickname', c).text).toBe('시안');
    expect(resolveBind('guardians', c).text).toBe('아빠 이윤종 · 엄마 이다영');
    expect(resolveBind('firstBirthday', c).text).toBe('시안이의 첫 생일');
    expect(resolveBind('firstBirthday', { ...c, basic: { ...c.basic, nickname: '하나' } }).text).toBe('하나의 첫 생일');
    expect(resolveBind('venue', c).text).toBe('비비드 파티룸');
    expect(resolvePhoto(c)).toBe('cover.jpg');
  });
  it('이름이 비면 안내 글자(placeholder)', () => {
    expect(resolveBind('childName', base)).toEqual({ text: '아이 이름', placeholder: true });
    expect(resolvePhoto(base)).toBeNull();
  });
  it('정보 글자 목록은 테마별', () => {
    expect(bindsFor('dol')).toContain('childName');
    expect(bindsFor('dol')).not.toContain('coupleNames');
    expect(bindsFor('wedding')).toContain('coupleNames');
  });
  it('정보 글자 이름: 돌잔치는 예식 말을 쓰지 않는다', () => {
    expect(bindLabel('venue', 'dol')).toBe('장소명');
    expect(bindLabel('datetime', 'dol')).toBe('일시');
    expect(bindLabel('venue', 'wedding')).toBe('예식장명');
    expect(bindLabel('childName', 'dol')).toBe('아이 이름');
  });
});
