/** 엑셀이 한글을 UTF-8 로 읽도록 맨 앞에 붙이는 BOM */
const BOM = '﻿';

/** 엑셀이 수식으로 읽는 첫 글자 */
const FORMULA_START = /^[=+\-@]/;

function cell(value: string | number | null): string {
  if (value == null) return '';
  // 숫자는 수식이 될 수 없으므로 그대로 (-5 같은 음수 포함)
  if (typeof value === 'number') return String(value);
  let s = FORMULA_START.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV 글. BOM 으로 시작하고 줄은 \n 으로 나눈다 */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return BOM + [header, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}
