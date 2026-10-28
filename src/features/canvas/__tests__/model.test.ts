import { defaultContent } from '../../invitation/model';
import {
  addElement,
  canAdd,
  CANVAS_LIMITS,
  checkGif,
  checkVideo,
  duplicateElement,
  fitSlide,
  isGifFile,
  needsSessionUrl,
  palette,
  removeElement,
  reorderElement,
  resolveBind,
  snapCenter,
  snapRotation,
  strokeFromPoints,
  textForPaste,
  updateElement,
  finishTextEdit,
  inRect,
  tapToSlide,
  isBrokenMedia,
} from '../model';
import type { CanvasDoc, CanvasElement, TextElement } from '../types';

const content = () => defaultContent(new Date(2026, 11, 24)); // 예식일 = 2026-12-31(목)
const text = (id: string): CanvasElement => ({
  id, kind: 'text', text: id, x: 0.5, y: 0.5, w: 0.5, rotation: 0, font: 'sans', color: '#000', size: 0.05, align: 'center',
});
const gif = (id: string): CanvasElement => ({ id, kind: 'gif', uri: 'a.gif', aspect: 1, x: 0.5, y: 0.5, w: 0.3, rotation: 0 });
const doc = (elements: CanvasElement[] = []): CanvasDoc => ({ background: { kind: 'template' }, elements });

describe('resolveBind', () => {
  it('이름이 비면 안내 글자를 흐리게(placeholder) 보여준다', () => {
    const c = content();
    expect(resolveBind('coupleNames', c)).toEqual({ text: '신랑 ♥ 신부', placeholder: true });
    expect(resolveBind('groomName', c)).toEqual({ text: '신랑', placeholder: true });
    expect(resolveBind('venue', c)).toEqual({ text: '예식장', placeholder: true });
  });
  it('폼 값이 있으면 그 값으로 만든다', () => {
    const c = content();
    c.basic.groom.name = '홍길동';
    c.basic.bride.name = '성춘향';
    c.ceremony.time = '14:00';
    expect(resolveBind('coupleNames', c)).toEqual({ text: '홍길동 ♥ 성춘향', placeholder: false });
    expect(resolveBind('date', c).text).toBe('2026 / 12 / 31');
    expect(resolveBind('weekday', c).text).toBe('Thursday');
    expect(resolveBind('datetime', c).text).toBe('2026년 12월 31일 목요일, 오후 2시');
    expect(resolveBind('time', c).text).toBe('오후 2시');
  });
});

describe('canAdd', () => {
  it('30번째까지 넣을 수 있고 31번째는 거부한다 (선 포함)', () => {
    const d29 = doc(Array.from({ length: 29 }, (_, i) => text(`t${i}`)));
    expect(canAdd(d29, 'stroke')).toBeNull();
    const d30 = doc(Array.from({ length: CANVAS_LIMITS.elements }, (_, i) => text(`t${i}`)));
    expect(canAdd(d30, 'stroke')).toBe('elements');
  });
  it('GIF는 3개, 동영상은 1개까지', () => {
    expect(canAdd(doc([gif('a'), gif('b')]), 'gif')).toBeNull();
    expect(canAdd(doc([gif('a'), gif('b'), gif('c')]), 'gif')).toBe('gifs');
    const video: CanvasElement = { id: 'v', kind: 'video', uri: 'v.mp4', aspect: 1, durationMs: 1000, x: 0.5, y: 0.5, w: 0.5, rotation: 0 };
    expect(canAdd(doc([video]), 'video')).toBe('videos');
    expect(canAdd(doc([video]), 'gif')).toBeNull();
  });
});

describe('붙기·맞춤', () => {
  it('가운데 근처면 0.5로 붙고 가이드를 켠다', () => {
    expect(snapCenter(0.51, 0.3)).toEqual({ x: 0.5, y: 0.3, guideX: true, guideY: false });
    expect(snapCenter(0.6, 0.505)).toEqual({ x: 0.6, y: 0.5, guideX: false, guideY: true });
  });
  it('중심은 슬라이드 안으로 제한한다', () => {
    expect(snapCenter(-0.2, 1.4)).toMatchObject({ x: 0, y: 1 });
  });
  it('회전은 90도 배수 5도 이내에서 붙는다', () => {
    expect(snapRotation(3)).toBe(0);
    expect(snapRotation(87)).toBe(90);
    expect(snapRotation(-178)).toBe(-180);
    expect(snapRotation(30)).toBe(30);
  });
  it('fitSlide: 폰·폴드 펼침·PC 모두 9:16 유지, 화면 안에 들어간다', () => {
    expect(fitSlide(360, 640)).toEqual({ width: 360, height: 640 });
    expect(fitSlide(600, 700)).toEqual({ width: 393, height: 698 });
    expect(fitSlide(1280, 800)).toEqual({ width: 450, height: 800 });
  });
});

describe('strokeFromPoints', () => {
  it('점 1개는 선이 아니다', () => {
    expect(strokeFromPoints([{ x: 10, y: 10 }], 360, '#000', 4)).toBeNull();
  });
  it('상자 대비 0~1 좌표와 슬라이드 비율 중심을 만든다', () => {
    const s = strokeFromPoints([{ x: 100, y: 100 }, { x: 200, y: 100 }], 360, '#000', 4)!;
    expect(s.kind).toBe('stroke');
    expect(s.x).toBeCloseTo(150 / 360);
    expect(s.y).toBeCloseTo(100 / 640);
    expect(s.w).toBeCloseTo(104 / 360); // 길이 100 + 굵기 4
    expect(s.width).toBeCloseTo(4 / 360);
    expect(s.points.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('문서 조작', () => {
  it('추가·수정·삭제', () => {
    let d = addElement(doc(), text('a'));
    d = updateElement(d, 'a', { x: 0.2 });
    expect(d.elements[0].x).toBe(0.2);
    expect(removeElement(d, 'a').elements).toEqual([]);
  });
  it('복제는 살짝 비켜서 맨 앞에 넣고 새 id를 준다', () => {
    const { doc: d, id } = duplicateElement(doc([text('a'), text('b')]), 'a');
    expect(d.elements).toHaveLength(3);
    expect(d.elements[2].id).toBe(id);
    expect(id).not.toBe('a');
    expect(d.elements[2].x).toBeCloseTo(0.53);
  });
  it('앞으로/뒤로는 한 칸씩, 끝에서는 그대로', () => {
    const d = doc([text('a'), text('b'), text('c')]);
    expect(reorderElement(d, 'a', 'front').elements.map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(reorderElement(d, 'a', 'back')).toBe(d);
    expect(reorderElement(d, 'c', 'front')).toBe(d);
  });
});

describe('미디어 검사', () => {
  it('GIF 10MB 초과 거부', () => {
    expect(checkGif({ size: 10 * 1024 * 1024 })).toBeNull();
    expect(checkGif({ size: 10 * 1024 * 1024 + 1 })).toBe('size');
  });
  it('동영상: 확장자 → 길이 → 용량 순으로 검사', () => {
    expect(checkVideo({ name: 'a.avi', size: 1, durationMs: 1000 })).toBe('extension');
    expect(checkVideo({ name: 'a.mp4', size: 1, durationMs: 15001 })).toBe('duration');
    expect(checkVideo({ name: 'a.MOV', size: 31 * 1024 * 1024, durationMs: 1000 })).toBe('size');
    expect(checkVideo({ mimeType: 'video/mp4', size: 1, durationMs: 15000 })).toBeNull();
  });
  it('GIF 판별은 이름·MIME·data URI 중 하나로', () => {
    expect(isGifFile({ name: 'a.GIF' })).toBe(true);
    expect(isGifFile({ mimeType: 'image/gif' })).toBe(true);
    expect(isGifFile({ uri: 'data:image/gif;base64,AAA' })).toBe(true);
    expect(isGifFile({ name: 'a.png', mimeType: 'image/png', uri: 'file:///a.png' })).toBe(false);
  });
  it('웹의 GIF·동영상 data URI만 객체 URL로 바꾼다 (저장 용량 보호)', () => {
    expect(needsSessionUrl('gif', 'data:image/gif;base64,AA', 'web')).toBe(true);
    expect(needsSessionUrl('video', 'data:video/mp4;base64,AA', 'web')).toBe(true);
    expect(needsSessionUrl('image', 'data:image/jpeg;base64,AA', 'web')).toBe(false);
    expect(needsSessionUrl('gif', 'file:///a.gif', 'ios')).toBe(false);
  });
});

describe('기타', () => {
  it('팔레트는 템플릿 색 4개 + 기본색, 중복 없이 8개', () => {
    const p = palette({ fg: '#111111', sub: '#777777', accent: '#111111', bg: '#FFFFFF' });
    expect(p).toHaveLength(8);
    expect(new Set(p).size).toBe(8);
    expect(p[0]).toBe('#111111');
  });
  it('붙여넣기 텍스트는 앞뒤 공백 제거 후 100자로 자른다', () => {
    expect(textForPaste('  안녕  ')).toBe('안녕');
    expect(textForPaste('가'.repeat(150))).toHaveLength(100);
  });
});

describe('인스타식 편집 규칙', () => {
  const doc: CanvasDoc = { background: { kind: 'template' }, elements: [] };
  const text = (id: string, t: string): TextElement => ({
    id,
    kind: 'text',
    text: t,
    x: 0.5,
    y: 0.5,
    w: 0.8,
    rotation: 0,
    font: 'sans',
    color: '#000000',
    size: 0.05,
    align: 'center',
  });

  it('새 글자: 쓴 게 있으면 더하고, 비었으면 아무것도 안 생긴다', () => {
    expect(finishTextEdit(doc, text('a', ''), true, '  안녕  ').elements).toEqual([text('a', '안녕')]);
    expect(finishTextEdit(doc, text('a', ''), true, '   ')).toBe(doc);
  });
  it('있던 글자: 고치면 바꾸고, 다 지우면 요소를 지운다', () => {
    const d = addElement(doc, text('a', '전'));
    expect(finishTextEdit(d, { ...text('a', '전'), color: '#FF0000' }, false, '후').elements[0]).toEqual({
      ...text('a', '후'),
      color: '#FF0000',
    });
    expect(finishTextEdit(d, text('a', '전'), false, '').elements).toEqual([]);
  });
  it('글자 수 한도에서 자른다', () => {
    const long = 'ㄱ'.repeat(CANVAS_LIMITS.text + 10);
    const out = finishTextEdit(doc, text('a', ''), true, long).elements[0] as TextElement;
    expect(out.text).toHaveLength(CANVAS_LIMITS.text);
  });
  it('휴지통 판정: 손가락이 휴지통 상자 안이면 true', () => {
    const trash = { x: 100, y: 500, width: 56, height: 56 };
    expect(inRect({ x: 128, y: 528 }, trash)).toBe(true);
    expect(inRect({ x: 90, y: 528 }, trash)).toBe(false);
    expect(inRect({ x: 128, y: 560 }, null)).toBe(false);
  });
  it('슬라이드 안을 누른 위치 → 비율 좌표 (밖이면 가운데)', () => {
    expect(tapToSlide({ x: 150, y: 400 }, { x: 50, y: 100, width: 200, height: 356 })).toEqual({ x: 0.5, y: 300 / 356 });
    expect(tapToSlide({ x: 10, y: 10 }, { x: 50, y: 100, width: 200, height: 356 })).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('깨진 사진 표시', () => {
  it('깨졌던 주소에만 깨진 표시 — 사진을 바꾸면 새 주소로 다시 그린다', () => {
    expect(isBrokenMedia('a.jpg', 'a.jpg')).toBe(true);
    expect(isBrokenMedia('a.jpg', 'b.jpg')).toBe(false);
    expect(isBrokenMedia(null, 'a.jpg')).toBe(false);
    expect(isBrokenMedia('a.jpg', null)).toBe(false);
  });
});
