import { describe, expect, it } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('BOM·따옴표·수식 막기', () => {
    expect(toCsv(['이름'], [['=1+1'], ['a,b']])).toBe('﻿이름\n\'=1+1\n"a,b"');
  });

  it('따옴표는 두 번, 줄바꿈 칸은 따옴표, null 은 빈칸, 숫자는 그대로', () => {
    expect(toCsv(['a', 'b', 'c', 'd'], [['say "hi"', 'x\ny', null, -5]])).toBe(
      '﻿a,b,c,d\n"say ""hi""","x\ny",,-5',
    );
  });

  it('+·-·@ 로 시작하는 글자 칸도 막는다', () => {
    expect(toCsv(['a', 'b', 'c'], [['+82', '-1', '@x']])).toBe("﻿a,b,c\n'+82,'-1,'@x");
  });
});
