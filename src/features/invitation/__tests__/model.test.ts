import {
  canFinalize,
  createInvitation,
  ddayParts,
  defaultContent,
  givenName,
  isValidInvitationName,
  monthMatrix,
  newInvitationNumber,
  normalizeInvitation,
  pageOrder,
  sectionTabs,
  validateGuestbookEntry,
  validateSection,
} from '../model';

const TODAY = new Date(2026, 9, 15); // 2026-10-15

describe('defaultContent', () => {
  it('defaults the ceremony date to today + 7 days', () => {
    expect(defaultContent(TODAY).ceremony.date).toBe('2026-10-22');
  });
  it('defaults titles and messages from the design', () => {
    const c = defaultContent(TODAY);
    expect(c.basic.groom.title).toBe('아들');
    expect(c.basic.bride.title).toBe('딸');
    expect(c.greeting.appendNames).toBe(true);
    expect(c.account.message).toContain('계좌번호를 기재하였습니다');
    expect(c.ending.content).toContain('먼길 와주셔서 감사합니다');
  });
});

describe('pageOrder', () => {
  const order = ['gallery', 'ceremony', 'guestbook', 'account'] as const;
  it('keeps cover/greeting first and ending last', () => {
    const enabled = { account: true, gallery: true, guestbook: true, ending: true, bgm: false };
    expect(pageOrder(enabled, [...order])).toEqual([
      'cover', 'greeting', 'gallery', 'ceremony', 'guestbook', 'account', 'ending',
    ]);
  });
  it('hides disabled pages but never the ceremony page', () => {
    const enabled = { account: false, gallery: false, guestbook: true, ending: false, bgm: true };
    expect(pageOrder(enabled, [...order])).toEqual(['cover', 'greeting', 'ceremony', 'guestbook']);
  });
});

describe('sectionTabs', () => {
  it('lists fixed sections then enabled optional ones in design order', () => {
    expect(sectionTabs({ account: true, gallery: false, guestbook: true, ending: false, bgm: true })).toEqual([
      'basic', 'ceremony', 'greeting', 'account', 'guestbook', 'bgm',
    ]);
  });
});

describe('validateSection: basic', () => {
  const base = () => defaultContent(TODAY);
  it('requires groom and bride name + title', () => {
    const c = base();
    expect(validateSection('basic', c)).not.toEqual([]);
    c.basic.groom.name = '홍길동';
    c.basic.bride.name = '성춘향';
    expect(validateSection('basic', c)).toEqual([]);
  });
  it('requires a title when a parent name is given, and vice versa', () => {
    const c = base();
    c.basic.groom.name = '홍길동';
    c.basic.bride.name = '성춘향';
    c.basic.groomFather = { name: '홍석범', title: '', deceased: false };
    expect(validateSection('basic', c)).toContain('groomFather');
    c.basic.groomFather.title = '아버지';
    c.basic.brideMother = { name: '', title: '어머니', deceased: false };
    expect(validateSection('basic', c)).toContain('brideMother');
  });
  it('limits names and titles to 10 characters', () => {
    const c = base();
    c.basic.groom.name = '가'.repeat(11);
    c.basic.bride.name = '성춘향';
    expect(validateSection('basic', c)).toContain('groom');
  });
});

describe('validateSection: ceremony', () => {
  it('requires venue, address, date and time', () => {
    const c = defaultContent(TODAY);
    expect(validateSection('ceremony', c)).toEqual(expect.arrayContaining(['venue', 'address']));
    c.ceremony.venue = '더채플';
    c.ceremony.address = '서울 강남구 테헤란로 1';
    expect(validateSection('ceremony', c)).toEqual([]);
  });
  it('requires 1~3 map images when the map is used with a manual address', () => {
    const c = defaultContent(TODAY);
    c.ceremony.venue = '더채플';
    c.ceremony.address = '서울 강남구 테헤란로 1';
    c.ceremony.addressMode = 'manual';
    c.ceremony.mapMode = 'use';
    expect(validateSection('ceremony', c)).toContain('mapImages');
    c.ceremony.mapImages = ['a.jpg'];
    expect(validateSection('ceremony', c)).toEqual([]);
  });
});

describe('validateSection: greeting / ending / gallery / account / bgm', () => {
  it('greeting needs 1~300 characters', () => {
    const c = defaultContent(TODAY);
    c.greeting.content = '';
    expect(validateSection('greeting', c)).toContain('content');
    c.greeting.content = '가'.repeat(301);
    expect(validateSection('greeting', c)).toContain('content');
    c.greeting.content = '초대합니다';
    expect(validateSection('greeting', c)).toEqual([]);
  });
  it('gallery needs 4~12 photos', () => {
    const c = defaultContent(TODAY);
    c.gallery.photos = ['1', '2', '3'];
    expect(validateSection('gallery', c)).toContain('photos');
    c.gallery.photos = ['1', '2', '3', '4'];
    expect(validateSection('gallery', c)).toEqual([]);
  });
  it('ending needs content and at most 3 photos', () => {
    const c = defaultContent(TODAY);
    expect(validateSection('ending', c)).toEqual([]);
    c.ending.photos = ['1', '2', '3', '4'];
    expect(validateSection('ending', c)).toContain('photos');
  });
  it('account requires groom and bride accounts and paired parent fields', () => {
    const c = defaultContent(TODAY);
    expect(validateSection('account', c)).toEqual(expect.arrayContaining(['groom', 'bride']));
    c.account.groom = { bank: '신한은행', number: '110-123' };
    c.account.bride = { bank: '국민은행', number: '220-456' };
    expect(validateSection('account', c)).toEqual([]);
    c.account.brideFather = { bank: '신한은행', number: '' };
    expect(validateSection('account', c)).toContain('brideFather');
  });
  it('bgm needs an uploaded file', () => {
    const c = defaultContent(TODAY);
    expect(validateSection('bgm', c)).toContain('file');
    c.bgm.uri = 'blob:song';
    expect(validateSection('bgm', c)).toEqual([]);
  });
});

describe('canFinalize', () => {
  it('is true only when every tab of enabled sections is completed', () => {
    const inv = createInvitation({ id: 'i1', ownerId: 'u1', themeId: 'wedding', templateId: 'wedding-1', today: TODAY });
    inv.enabled = { account: false, gallery: false, guestbook: false, ending: false, bgm: false };
    inv.completed = { basic: true, ceremony: true };
    expect(canFinalize(inv)).toBe(false);
    inv.completed.greeting = true;
    expect(canFinalize(inv)).toBe(true);
  });
});

describe('helpers', () => {
  it('givenName drops the surname of 3+ character names', () => {
    expect(givenName('홍길동')).toBe('길동');
    expect(givenName('성춘향')).toBe('춘향');
    expect(givenName('김연')).toBe('김연');
  });
  it('ddayParts splits remaining time and flags the past', () => {
    const now = new Date(2026, 9, 15, 10, 0, 0);
    const target = new Date(2026, 9, 20, 1, 22, 30);
    expect(ddayParts(target, now)).toEqual({ days: 4, hours: 15, minutes: 22, seconds: 30, daysLeft: 5, past: false });
    expect(ddayParts(now, target).past).toBe(true);
  });
  it('monthMatrix builds week rows starting on Sunday', () => {
    const rows = monthMatrix(2024, 12);
    expect(rows[0]).toEqual([1, 2, 3, 4, 5, 6, 7]); // 2024-12-01 은 일요일
    expect(rows[rows.length - 1]).toEqual([29, 30, 31, null, null, null, null]);
  });
  it('validates invitation names (1~30) and guestbook entries', () => {
    expect(isValidInvitationName('a')).toBe(true);
    expect(isValidInvitationName('')).toBe(false);
    expect(isValidInvitationName(' 우리 결혼 ')).toBe(true);
    expect(validateGuestbookEntry({ name: '홍길동', password: '1234', content: '축하해' })).toEqual([]);
    expect(validateGuestbookEntry({ name: '', password: '12', content: '' })).toEqual(['name', 'password', 'content']);
  });
});

describe('file checks', () => {
  const { checkImageFile, checkAudioFile } = require('../model');
  it('accepts jpg/jpeg/png by mime type or file name', () => {
    expect(checkImageFile({ mimeType: 'image/jpeg' })).toBe(true);
    expect(checkImageFile({ fileName: 'photo.PNG' })).toBe(true);
    expect(checkImageFile({ uri: 'file:///a/b/c.jpeg' })).toBe(true);
  });
  it('rejects other image types', () => {
    expect(checkImageFile({ mimeType: 'image/gif', fileName: 'a.gif' })).toBe(false);
    expect(checkImageFile({ mimeType: 'image/heic' })).toBe(false);
  });
  it('checks audio extension and the 5MB limit', () => {
    expect(checkAudioFile({ name: 'song.mp3', size: 1024 })).toBe('ok');
    expect(checkAudioFile({ name: 'song.flac', size: 1024 })).toBe('extension');
    expect(checkAudioFile({ name: 'song.m4a', size: 5 * 1024 * 1024 + 1 })).toBe('size');
  });
});

describe('초대장 번호·이름·보정', () => {
  it('번호는 11자리 숫자', () => {
    expect(newInvitationNumber(() => 0)).toBe('10000000000');
    expect(newInvitationNumber(() => 0.999999999999)).toMatch(/^\d{11}$/);
    expect(createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }).number).toMatch(/^\d{11}$/);
  });
  it('이름은 1~30자', () => {
    expect(isValidInvitationName('가')).toBe(true);
    expect(isValidInvitationName('  ')).toBe(false);
    expect(isValidInvitationName('가'.repeat(31))).toBe(false);
  });
  it('예전 active 저장본은 final 로, 번호가 없으면 만들고 changed 표시', () => {
    const old = { ...createInvitation({ id: 'x', ownerId: 'u', themeId: 'wedding', templateId: 'wedding-1' }), status: 'active' } as unknown as Parameters<typeof normalizeInvitation>[0];
    delete (old as Partial<typeof old>).number;
    const { invitation, changed } = normalizeInvitation(old);
    expect(invitation.status).toBe('final');
    expect(invitation.number).toMatch(/^\d{11}$/);
    expect(changed).toBe(true);
    expect(normalizeInvitation(invitation).changed).toBe(false);
  });
});
