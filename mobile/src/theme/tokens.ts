/**
 * Apple-inspired Design Tokens
 *
 * 设计理念：深邃黑底 + 精致灰阶 + 系统蓝点缀
 * 追求克制、留白、呼吸感，让内容成为主角
 */

export const colors = {
  // ── Accent ──
  accent: '#0A84FF',
  accentLight: '#409CFF',
  accentDark: '#0071E3',
  accentSubtle: 'rgba(10, 132, 255, 0.12)',

  // ── Backgrounds ──
  bg: '#000000',
  bgSecondary: '#0A0A0C',
  bgElevated: '#1C1C1E',
  bgCard: '#1C1C1E',
  bgInput: '#1C1C1E',
  bgGrouped: '#000000',

  // ── Foregrounds ──
  text: '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary: '#48484A',
  textQuaternary: '#3A3A3C',

  // ── Separators ──
  separator: 'rgba(84, 84, 88, 0.35)',
  separatorOpaque: '#38383A',

  // ── Fill ──
  fillPrimary: 'rgba(120, 120, 128, 0.36)',
  fillSecondary: 'rgba(120, 120, 128, 0.24)',
  fillTertiary: 'rgba(120, 120, 128, 0.12)',

  // ── Status ──
  error: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',

  // ── Overlay ──
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayProminent: 'rgba(0, 0, 0, 0.7)',

  // ── Glass ──
  glass: 'rgba(28, 28, 30, 0.72)',
  glassLight: 'rgba(28, 28, 30, 0.48)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
  xxxl: 56,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, lineHeight: 41, letterSpacing: 0 },
  title1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: 0 },
  title2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: 0 },
  title3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 25, letterSpacing: 0 },
  headline: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400' as const, lineHeight: 21, letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0 },
  caption1: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: '400' as const, lineHeight: 13, letterSpacing: 0 },
};

/** 阴影 - Apple风格的柔和投影 */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
};
