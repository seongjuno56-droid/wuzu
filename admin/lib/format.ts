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
