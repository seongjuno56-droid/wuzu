import { Platform } from 'react-native';

/**
 * wuzu 디자인 토큰 — 화해(Hwahae) 디자인 시스템 스타일 참고
 * - 모노크롬 크롬: 회색 페이지(#f7f7f7) 위 흰 카드, 검정 텍스트, #e8e8e8 헤어라인
 * - 색은 '이미지'(테마 아트·템플릿 미리보기)가 담당, 브랜드 그린은 로고에만
 */
export const colors = {
  // 텍스트 사다리
  ink: '#000000',
  inkSoft: '#111111',
  label: '#3D3D3D',
  muted: '#666666',
  faint: '#999999',
  placeholder: '#AAAAAA',
  // 면과 선
  canvas: '#FFFFFF',
  surface: '#F7F7F7',
  hairline: '#E8E8E8',
  // 보조 액션 (파란 틴트)
  infoInk: '#3750BE',
  infoTint: '#EBF5FF',
  // 캠페인 포인트 (배너 등 극히 일부)
  mint: '#82E6E6',
  // 시그니처 그린 — 워드마크·주요 버튼·선택 상태·하단 탭 선택에 쓴다 (상태 배지·오류 색과는 구분)
  brand: '#183A2E',
  brandPressed: '#0F271E',
  brandTint: '#E7F0EB',
  // 상태
  danger: '#E03E3E',
  success: '#1F8A5B',
  kakao: '#FEE500',
  kakaoText: '#191600',
  dim: 'rgba(0, 0, 0, 0.5)',

  // ── 기존 화면 호환용 별칭 (의미 기준으로 매핑) ──
  primary: '#183A2E', // 주요 버튼 = 시그니처 그린
  primaryPressed: '#0F271E',
  primarySoft: '#F7F7F7',
  accent: '#111111', // 선택 상태
  accentDeep: '#3750BE',
  accentSoft: '#EBF5FF',
  bg: '#F7F7F7',
  sheet: '#FFFFFF',
  surfaceStrong: '#EEEEEE',
  border: '#E8E8E8',
  borderStrong: '#D8D8D8',
  text: '#000000',
  textSub: '#666666',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',
  info: '#3750BE',
} as const;

// 간격: chip 8 / icon 10 / tile 12 / control·card 16 / header 20
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
// 반경: chip 4 / button·card 8 / tile 12 / banner·큰 카드 16
export const radius = { xs: 4, sm: 8, md: 8, lg: 12, xl: 16, pill: 99999 } as const;

export const fonts = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  // 위계는 400/600 두 단계만 — medium·bold는 각각 400·600으로 수렴
  medium: 'Pretendard-Regular',
  bold: 'Pretendard-SemiBold',
  // 세리프는 초대장 '내용'(템플릿 미리보기)과 로고에만
  serif: 'Hahmlet-Medium',
  serifBold: 'Hahmlet-Bold',
  // 둥근 서체는 돌잔치 초대장 내용에만 (고운돋움은 굵기가 하나)
  round: 'GowunDodum-Regular',
  roundBold: 'GowunDodum-Regular',
} as const;
export type FontWeightName = keyof typeof fonts;

// Pretendard, Hahmlet, Gowun Dodum (모두 OFL-1.1) — 번들에 포함
export const fontSources = {
  [fonts.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
  [fonts.semibold]: require('../../assets/fonts/Pretendard-SemiBold.otf'),
  [fonts.serif]: require('@expo-google-fonts/hahmlet/500Medium/Hahmlet_500Medium.ttf'),
  [fonts.serifBold]: require('@expo-google-fonts/hahmlet/700Bold/Hahmlet_700Bold.ttf'),
  [fonts.round]: require('@expo-google-fonts/gowun-dodum/400Regular/GowunDodum_400Regular.ttf'),
};

// 앱 밀도 스케일: 최대 20px, 제목만 -0.2px 트래킹
export const typography = {
  display: { fontSize: 32, lineHeight: 40, weight: 'semibold', tracking: -0.4 }, // 숫자 강조 전용
  invite: { fontSize: 20, lineHeight: 30, weight: 'serif', tracking: -0.2 }, // 초대장 문구
  headline: { fontSize: 20, lineHeight: 28, weight: 'semibold', tracking: -0.2 }, // title-large
  title: { fontSize: 18, lineHeight: 26, weight: 'semibold', tracking: -0.2 }, // section
  subtitle: { fontSize: 15, lineHeight: 23, weight: 'semibold', tracking: 0 }, // nav·button
  body: { fontSize: 16, lineHeight: 24, weight: 'regular', tracking: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 24, weight: 'semibold', tracking: 0 },
  caption: { fontSize: 14, lineHeight: 21, weight: 'regular', tracking: 0 }, // label·card-title
  tiny: { fontSize: 12, lineHeight: 18, weight: 'regular', tracking: 0 }, // caption
} as const satisfies Record<
  string,
  { fontSize: number; lineHeight: number; weight: FontWeightName; tracking: number }
>;
export type TypographyVariant = keyof typeof typography;

/** 유일한 엘리베이션: 카드 그림자 */
export const shadow = Platform.select({
  web: { boxShadow: 'rgba(0, 0, 0, 0.08) 0px 2px 8px 0px' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
}) as object;

/** 웹에서 폰 폭으로 보이도록 하는 최대 너비 (화해 웹의 560px 컬럼) */
export const MAX_APP_WIDTH = 560;

/**
 * 모달(RN Modal)은 웹에서 앱 프레임 밖, 브라우저 전체에 그려진다.
 * 시트·전체 화면 모달 본문에 이 스타일을 주어 앱 영역 폭(가운데 560px) 안에 두고, 어두운 배경만 전체를 덮는다.
 */
export const appColumn = { width: '100%', maxWidth: MAX_APP_WIDTH, alignSelf: 'center' } as const;
