export const colors = {
  // 主色
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // 背景
  bg: '#0A0A0F',
  bgSecondary: '#12121A',
  bgCard: '#1A1A26',
  bgInput: '#1E1E2E',

  // 文字
  text: '#F0F0F5',
  textSecondary: '#8888A0',
  textTertiary: '#55556A',

  // 边框
  border: '#2A2A3C',
  borderFocus: '#6C5CE7',

  // 状态
  error: '#FF6B6B',
  success: '#51CF66',

  // 透明
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
};
