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

describe('대표 사진 없는 모임 표지', () => {
  const style = getTemplates('meetup')[0].style;
  const ys = (doc: ReturnType<typeof coverPreset>) => Object.fromEntries(doc.elements.map((e) => [e.id, e.y]));
  it('글자 묶음을 위로 올려 표지 가운데에 둔다', () => {
    const withPhoto = ys(coverPreset(style, 'meetup'));
    const noPhoto = ys(coverPreset(style, 'meetup', { hasPhoto: false }));
    expect(noPhoto['preset-label']).toBeLessThan(withPhoto['preset-label']);
    // 글자 묶음(라벨~장소)의 가운데가 표지 세로 가운데(0.5) 근처
    expect(Math.abs((noPhoto['preset-label'] + noPhoto['preset-venue']) / 2 - 0.5)).toBeLessThan(0.05);
  });
  it('사진 칸은 남기되 글자와 겹치지 않게 위쪽에 작게', () => {
    const doc = coverPreset(style, 'meetup', { hasPhoto: false });
    const photo = doc.elements.find((e) => e.kind === 'photo');
    const label = doc.elements.find((e) => e.id === 'preset-label');
    if (photo?.kind !== 'photo' || !label) throw new Error('사진 칸 없음');
    // 사진 아래 끝(세로 비율, 슬라이드 높이 = 폭 × 16/9) < 라벨 위치
    expect(photo.y + (photo.w * photo.aspect) / (16 / 9) / 2).toBeLessThan(label.y - 0.02);
  });
});
