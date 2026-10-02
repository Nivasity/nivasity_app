// Fintech palette shared with the white-label web portal: orange accent, plum secondary,
// soft neutral surfaces and a softer ink instead of pure black.
export const brandColors = {
  accent: '#ff9100',
  accentMuted: 'rgba(255, 145, 0, 0.9)',
  /** Darker orange used as the bottom "lip" under raised orange buttons. */
  accentLip: '#C26A00',
  secondary: '#7a3b73',
  secondaryLip: '#4E2149',
  accentCard: '#FFF0DDFF',
  /** Wallet card gradient: plum to orange. */
  gradientFrom: '#5B2457',
  gradientVia: '#8C3B66',
  gradientTo: '#F57C00',
};

export type AppThemeMode = 'system' | 'light' | 'dark';

export type AppColors = {
  accent: string;
  accentMuted: string;
  accentLip: string;
  /** Soft orange fill for chips, icon circles and highlighted rows. */
  accentSoft: string;
  secondary: string;
  secondaryLip: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  accentCard: string;
  text: string;
  textMuted: string;
  border: string;
  /** Bottom lip under raised cards. */
  cardLip: string;
  info: string;
  infoSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  onAccent: string;
  onCard: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
};

export const lightColors: AppColors = {
  accent: brandColors.accent,
  accentMuted: brandColors.accentMuted,
  accentLip: brandColors.accentLip,
  accentSoft: '#FFF1E0',
  secondary: brandColors.secondary,
  secondaryLip: brandColors.secondaryLip,
  background: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EEEEF2',
  accentCard: brandColors.accentCard,
  text: '#26262E',
  textMuted: '#6E6E7A',
  border: '#E4E4EA',
  cardLip: '#DCDCE3',
  info: '#2563EB',
  infoSoft: '#E6EEFF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#16A34A',
  successSoft: '#E7F7EC',
  warning: '#F59E0B',
  onAccent: '#FFFFFF',
  onCard: '#FFFBF6FF',
  gradientFrom: brandColors.gradientFrom,
  gradientVia: brandColors.gradientVia,
  gradientTo: brandColors.gradientTo,
};

export const darkColors: AppColors = {
  accent: brandColors.accent,
  accentMuted: brandColors.accentMuted,
  accentLip: '#A85C00',
  accentSoft: '#33220F',
  secondary: brandColors.secondary,
  secondaryLip: '#3A1836',
  background: '#0B0A0E',
  surface: '#17161C',
  surfaceAlt: '#211F27',
  accentCard: brandColors.accentCard,
  text: '#E6E6EB',
  textMuted: '#9C9BA8',
  border: '#2B2A33',
  cardLip: '#24232B',
  info: '#60A5FA',
  infoSoft: '#16213A',
  danger: '#F87171',
  dangerSoft: '#3A1719',
  success: '#4ADE80',
  successSoft: '#12291B',
  warning: '#FBBF24',
  onAccent: '#FFFFFF',
  onCard: '#A3B3CC',
  gradientFrom: brandColors.gradientFrom,
  gradientVia: brandColors.gradientVia,
  gradientTo: brandColors.gradientTo,
};
