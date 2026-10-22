import {
  addDays,
  bornLine,
  ddayLine,
  defaultDolContent,
  guardianNames,
  nicknameOf,
  seedTimeline,
  treasureLine,
  validateDol,
} from '../dol';
import { formatShortDate } from '../model';
import type { DolContent } from '../model';
import '../registerThemes';
import { createInvitation, sectionTabs, themeDef } from '../themes';

const today = new Date(2026, 9, 22);

describe('돌잔치', () => {
  it('기본값: 보호자 아빠·엄마 두 칸, 인사말 미리 채움, 성장 이야기는 비어 있음', () => {
    const c = defaultDolContent(today);
    expect(c.theme).toBe('dol');
    expect(c.basic.guardians.map((g) => g.relation)).toEqual(['아빠', '엄마']);
    expect(c.greeting.content).toContain('첫 번째 생일');
    expect(c.timeline.items).toEqual([]);
  });
  it('테마 등록: 입력 탭과 장 순서', () => {
    const inv = createInvitation({ id: 'i', ownerId: 'u', themeId: 'dol', templateId: 'dol-1', today });
    expect(sectionTabs(inv)).toEqual([
      'basic',
      'ceremony',
      'greeting',
      'profile',
      'timeline',
      'account',
      'gallery',
      'guestbook',
      'ending',
    ]);
    expect(inv.order).toEqual(['profile', 'timeline', 'ceremony', 'gallery', 'guestbook', 'account']);
    expect(themeDef('dol').pageLabel('ceremony')).toBe('일시·장소');
  });
  it('부르는 이름·보호자 이름', () => {
    const b = { ...defaultDolContent(today).basic, childName: '이시안' };
    expect(nicknameOf(b)).toBe('시안');
    expect(nicknameOf({ ...b, nickname: '콩이' })).toBe('콩이');
    expect(nicknameOf({ ...b, childName: '하늘' })).toBe('하늘');
    const g = b.guardians.map((x, i) => ({ ...x, name: ['이윤종', ''][i] }));
    expect(guardianNames({ ...b, guardians: g })).toBe('이윤종');
  });
  it('성장 이야기 미리 채우기: 100일 = 태어난 날 + 99일, 첫 생일 = 행사일', () => {
    const items = seedTimeline([], '2025-04-26', '2026-04-26');
    expect(items.map((i) => [i.title, i.date])).toEqual([
      ['태어난 날', '2025-04-26'],
      ['100일', '2025-08-03'],
      ['첫 걸음마', ''],
      ['첫 생일', '2026-04-26'],
    ]);
    expect(addDays('2025-04-26', 99)).toBe('2025-08-03');
  });
  it('태어난 날을 바꿔도 사용자가 고친 항목은 그대로', () => {
    const first = seedTimeline([], '2025-04-26', '2026-04-26');
    const edited = first.map((i, n) => (n === 1 ? { ...i, text: '내가 쓴 글', edited: true } : i));
    const again = seedTimeline(edited, '2025-05-01', '2026-05-01');
    expect(again[0].date).toBe('2025-05-01');
    expect(again[1]).toEqual(edited[1]);
  });
  it('검사: 아이 이름·태어난 날·표지 사진 필수, 태어난 날은 행사일보다 앞', () => {
    const c: DolContent = defaultDolContent(today);
    expect(validateDol('basic', c)).toEqual(expect.arrayContaining(['childName', 'birthDate', 'photo']));
    const ok: DolContent = {
      ...c,
      basic: {
        ...c.basic,
        childName: '이시안',
        birthDate: '2025-04-26',
        photo: 'p.jpg',
        guardians: c.basic.guardians.map((g) => ({ ...g, name: '보호자' })),
      },
    };
    expect(validateDol('basic', ok)).toEqual([]);
    const late = { ...ok, basic: { ...ok.basic, birthDate: '2099-01-01' } };
    expect(validateDol('basic', late)).toContain('birthDate');
  });
  it('계좌: 보호자를 지우면 그 계좌는 검사에서 빠지고, 한 명 이상은 채워야 한다', () => {
    const c = defaultDolContent(today);
    const [dad, mom] = c.basic.guardians;
    const withAcc = { ...c, account: { ...c.account, accounts: { [mom.id]: { bank: '국민', number: '123' } } } };
    expect(validateDol('account', withAcc)).toEqual([]);
    const momGone = { ...withAcc, basic: { ...withAcc.basic, guardians: [dad] } };
    expect(validateDol('account', momGone)).toEqual(['accounts']);
  });
  it('공통 섹션(인사말·일시)은 결혼식과 같은 규칙', () => {
    const c = defaultDolContent(today);
    expect(validateDol('greeting', c)).toEqual([]);
    expect(validateDol('ceremony', c)).toEqual(expect.arrayContaining(['venue', 'address']));
  });
  it('하객 화면 문장', () => {
    const base = defaultDolContent(today);
    const b = {
      ...base.basic,
      childName: '이시안',
      birthDate: '2025-04-26',
      guardians: base.basic.guardians.map((g, i) => ({ ...g, name: ['이윤종', '이다영'][i] })),
    };
    expect(bornLine(b)).toBe('2025년 4월 26일에 태어난');
    expect(treasureLine(b)).toBe('이윤종 · 이다영의 보물');
    expect(treasureLine({ ...b, guardians: [] })).toBe('');
    expect(ddayLine({ ...base, basic: b }, 3)).toBe('시안이의 첫 생일까지 3일');
    expect(formatShortDate('2025-04-26')).toBe('2025년 4월 26일');
  });
});
