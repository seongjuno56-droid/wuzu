import { AUDIT_FIELD_LABEL, AUDIT_VALUE_LABEL } from './labels';

/** 화면·CSV 에 보이는 날짜는 모두 한국 시간 */
const dateTimeFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 'YYYY-MM-DD HH:mm' (한국 시간). 없으면 빈 글자 */
export function formatDateTime(d: Date | null | undefined): string {
  return d ? dateTimeFormat.format(d) : '';
}

/** 'YYYY-MM-DD' (한국 시간). 없으면 빈 글자 */
export function formatDate(d: Date | null | undefined): string {
  return formatDateTime(d).slice(0, 10);
}

/** 파일 이름용 'YYYYMMDD' (한국 시간) */
export function compactDate(d: Date): string {
  return formatDate(d).replace(/-/g, '');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 칸에 정해진 한국어 표시가 있으면 그것, 없으면 showValue */
function showFieldValue(key: string, v: unknown): string {
  const label = AUDIT_VALUE_LABEL[key]?.[String(v)];
  return label ?? showValue(v);
}

function showValue(v: unknown): string {
  if (v === undefined || v === null) return '없음';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

/**
 * 작업 기록의 before→after 를 한 줄로. 예: '상태: 정상 → 정지'.
 * 바뀐 칸만 보여 주고, before 가 없으면(추가) 'after 값'만 보여 준다.
 */
export function summarizeChange(before: unknown, after: unknown): string {
  if (!isRecord(before) && !isRecord(after)) {
    if (before == null && after == null) return '';
    return `${showValue(before)} → ${showValue(after)}`;
  }
  const b = isRecord(before) ? before : null;
  const a = isRecord(after) ? after : {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b ?? {})])];
  return keys
    .filter((k) => !b || JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => {
      const label = AUDIT_FIELD_LABEL[k] ?? k;
      return b ? `${label}: ${showFieldValue(k, b[k])} → ${showFieldValue(k, a[k])}` : `${label}: ${showFieldValue(k, a[k])}`;
    })
    .join(', ');
}
