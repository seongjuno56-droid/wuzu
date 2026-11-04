import { thumbKeyOf } from '../../../supabase/functions/_shared/uploadRules';

const R2 = 'r2://';

/** EXPO_PUBLIC_* 는 빌드 때 박히므로 process.env.이름 으로 직접 읽는다. 끝 슬래시는 정리한다 */
const baseUrl = () => (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

/** 앱 값(공개 주소) → 서버 값(r2://키). 도메인이 바뀌어도 저장 값은 그대로다. 우리 저장소 주소가 아니면 그대로 */
export function toMediaRef(url: string): string {
  const base = baseUrl();
  return base && url.startsWith(`${base}/`) ? `${R2}${url.slice(base.length + 1)}` : url;
}

/** 서버 값 → 앱 값. 주소 환경 변수가 없으면 r2 값을 그대로 둔다 */
export function fromMediaRef(ref: string): string {
  const base = baseUrl();
  return base && ref.startsWith(R2) ? `${base}/${ref.slice(R2.length)}` : ref;
}

/** 키 → 공개 주소. 주소 환경 변수가 없으면 저장해도 볼 수 없으므로 올리기를 실패시킨다 */
export function mediaUrlOfKey(key: string): string {
  const base = baseUrl();
  if (!base) throw new Error(/* i18n-ignore */ 'EXPO_PUBLIC_MEDIA_BASE_URL 이 없다');
  return `${base}/${key}`;
}

/** 본 이미지 주소 → 긴 변 400px 작은 사진 주소 */
export const thumbUrlOf = (url: string) => thumbKeyOf(url);
