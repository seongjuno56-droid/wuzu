import { getTemplates } from '../../../data/templates';
import { defaultMeetupContent } from '../../invitation/meetup';
import { bindLabel, bindsFor, resolveBind, resolvePhoto } from '../model';
import { coverPreset } from '../preset';

const base = defaultMeetupContent(new Date(2026, 9, 26));
const c = { ...base, basic: { ...base.basic, eventName: '연말 송년회', host: '03학번 동기' } };

describe('모임 표지', () => {
  it('배치: 선택 사진 + 모임 이름·주최·일시·장소', () => {
    const doc = coverPreset(getTemplates('meetup')[0].style, 'meetup');
    const photo = doc.elements.find((e) => e.kind === 'photo');
    expect(photo && photo.kind === 'photo' && photo.optional).toBe(true);
    const binds = doc.elements.flatMap((e) => (e.kind === 'bound' ? [e.bind] : []));
    expect(binds).toEqual(['eventName', 'host', 'datetime', 'venue']);
  });
  it('정보 글자와 라벨', () => {
    expect(resolveBind('eventName', c).text).toBe('연말 송년회');
    expect(resolveBind('eventName', base)).toEqual({ text: '모임 이름', placeholder: true });
    expect(bindLabel('eventName', 'meetup')).toBe('모임 이름');
    expect(bindsFor('meetup')).toContain('host');
  });
  it('대표 사진: 넣었으면 주소, 아니면 null', () => {
    expect(resolvePhoto(base)).toBeNull();
    expect(resolvePhoto({ ...c, basic: { ...c.basic, photo: 'p.jpg' } })).toBe('p.jpg');
  });
});
