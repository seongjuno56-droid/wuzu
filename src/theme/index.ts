import { Platform } from 'react-native';

export const colors = {
  primary: '#1F5E46', // 딥 포레스트 그린
  primaryPressed: '#174A37',
  primarySoft: '#E8F1EC',
  accent: '#C8A46A', // 초대장 느낌의 웜 골드
  accentSoft: '#F6EFE2',
  bg: '#FFFFFF',
  surface: '#F7F5F0', // 아이보리
  surfaceStrong: '#EEEBE3',
  border: '#E3E0D8',
  borderStrong: '#C9C5BA',
  text: '#1B1F1D',
  textSub: '#59615C',
  textMuted: '#9AA19C',
  textOnPrimary: '#FFFFFF',
  danger: '#D14343',
  success: '#1E8A5A',
  info: '#2F6FDB',
  kakao: '#FEE500',
  kakaoText: '#191600',
  dim: 'rgba(15, 20, 17, 0.5)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;
export type FontWeightName = keyof typeof fonts;

// Pretendard (OFL-1.1) — assets/fonts 에 포함
export const fontSources = {
  [fonts.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
  [fonts.medium]: require('../../assets/fonts/Pretendard-Medium.otf'),
  [fonts.semibold]: require('../../assets/fonts/Pretendard-SemiBold.otf'),
  [fonts.bold]: require('../../assets/fonts/Pretendard-Bold.otf'),
};

export const typography = {
  display: { fontSize: 30, lineHeight: 38, weight: 'bold' },
  title: { fontSize: 22, lineHeight: 30, weight: 'bold' },
  subtitle: { fontSize: 18, lineHeight: 26, weight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold' },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular' },
  tiny: { fontSize: 11, lineHeight: 15, weight: 'regular' },
} as const satisfies Record<string, { fontSize: number; lineHeight: number; weight: FontWeightName }>;
export type TypographyVariant = keyof typeof typography;

export const shadow = Platform.select({
  web: { boxShadow: '0 4px 16px rgba(20, 30, 25, 0.08)' },
  default: {
    shadowColor: '#14201A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
}) as object;

/** 웹에서 폰 폭으로 보이도록 하는 최대 너비 */
export const MAX_APP_WIDTH = 480;
