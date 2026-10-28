/** 다음(카카오) 우편번호 서비스 결과 중 쓰는 값 */
export interface PostcodeData {
  zonecode: string;
  roadAddress?: string;
  jibunAddress?: string;
  address?: string;
  userSelectedType?: 'R' | 'J';
  bname?: string;
  buildingName?: string;
  apartment?: 'Y' | 'N';
}

/**
 * 도로명 주소를 고르면 참고항목(법정동, 공동주택 건물명)을 상세주소 칸에 "(역삼동, 송도아파트)" 형태로 넣는다.
 * (다음 우편번호 서비스 공식 예제와 같은 규칙)
 */
export function parsePostcode(d: PostcodeData): { zonecode: string; address: string; addressDetail: string } {
  if (d.userSelectedType === 'J') {
    return { zonecode: d.zonecode, address: d.jibunAddress || d.address || '', addressDetail: '' };
  }
  const extras: string[] = [];
  if (d.bname && /[동로가]$/.test(d.bname)) extras.push(d.bname);
  if (d.buildingName && d.apartment === 'Y') extras.push(d.buildingName);
  return {
    zonecode: d.zonecode,
    address: d.roadAddress || d.address || '',
    addressDetail: extras.length ? `(${extras.join(', ')})` : '',
  };
}

export const POSTCODE_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
