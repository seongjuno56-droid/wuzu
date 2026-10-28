import { parsePostcode } from '../address';

describe('parsePostcode', () => {
  it('uses the road address and moves extra info into the detail', () => {
    expect(
      parsePostcode({
        zonecode: '06133',
        roadAddress: '서울 강남구 테헤란로 123',
        jibunAddress: '서울 강남구 역삼동 1',
        userSelectedType: 'R',
        bname: '역삼동',
        buildingName: '더채플',
        apartment: 'N',
      }),
    ).toEqual({ zonecode: '06133', address: '서울 강남구 테헤란로 123', addressDetail: '(역삼동)' });
  });
  it('includes apartment building names', () => {
    expect(
      parsePostcode({
        zonecode: '21999',
        roadAddress: '인천 연수구 능허대로 343',
        userSelectedType: 'R',
        bname: '송도동',
        buildingName: '송도아파트',
        apartment: 'Y',
      }).addressDetail,
    ).toBe('(송도동, 송도아파트)');
  });
  it('uses the jibun address with no extra when the user chose it', () => {
    expect(
      parsePostcode({ zonecode: '1', roadAddress: '도로명', jibunAddress: '지번 주소', userSelectedType: 'J', bname: '역삼동' }),
    ).toEqual({ zonecode: '1', address: '지번 주소', addressDetail: '' });
  });
});
