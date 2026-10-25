import { getTemplates } from '../../../data/templates';
import { defaultCorporateContent } from '../../invitation/corporate';
import type { CorporateContent } from '../../invitation/model';
import { bindLabel, bindsFor, resolveBind, resolvePhoto } from '../model';
import { coverPreset } from '../preset';

const base = defaultCorporateContent(new Date(2026, 9, 25));
const c: CorporateContent = {
  ...base,
  basic: { ...base.basic, eventName: '파트너스 데이', host: '우주컴퍼니' },
  ceremony: { ...base.ceremony, venue: '그랜드홀' },
};

describe('기업 표지', () => {
  it('배치: 로고 요소 + 행사명·주최·일시·장소', () => {
    const doc = coverPreset(getTemplates('corporate')[0].style, 'corporate');
    const logo = doc.elements.find((e) => e.kind === 'photo');
    expect(logo && logo.kind === 'photo' && logo.bind).toBe('logo');
    const binds = doc.elements.flatMap((e) => (e.kind === 'bound' ? [e.bind] : []));
    expect(binds).toEqual(['eventName', 'host', 'datetime', 'venue']);
  });
  it('정보 글자 값과 빈 칸 안내', () => {
    expect(resolveBind('eventName', c)).toEqual({ text: '파트너스 데이', placeholder: false });
    expect(resolveBind('host', c)).toEqual({ text: '우주컴퍼니', placeholder: false });
    expect(resolveBind('eventName', base)).toEqual({ text: '행사명', placeholder: true });
    expect(resolveBind('venue', base)).toEqual({ text: '장소', placeholder: true });
  });
  it('정보 글자 목록·이름', () => {
    expect(bindsFor('corporate')).toEqual(['eventName', 'host', 'date', 'weekday', 'datetime', 'time', 'venue']);
    expect(bindLabel('venue', 'corporate')).toBe('장소명');
    expect(bindLabel('eventName', 'corporate')).toBe('행사명');
  });
  it('로고: 넣었으면 주소, 안 넣었으면 null (빈 틀을 그리지 않는다)', () => {
    expect(resolvePhoto(base, 'logo')).toBeNull();
    expect(resolvePhoto({ ...c, basic: { ...c.basic, logo: 'logo.png' } }, 'logo')).toBe('logo.png');
    expect(resolvePhoto(c, 'coverPhoto')).toBeNull();
  });
});
