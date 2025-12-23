export const brandColors = {
  accent: '#ff9100',
  secondary: '#7a3b73',
  accentCard: '#FFF0DDFF',
};

export type AppThemeMode = 'system' | 'light' | 'dark';

export type AppColors = {
  accent: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  accentCard: string;
  text: string;
  textMuted: string;
  border: string;
  info: string;
  danger: string;
  success: string;
  warning: string;
  onAccent: string;
  onCard: string;
};

export const lightColors: AppColors = {
  accent: brandColors.accent,
  secondary: brandColors.secondary,
  background: '#FFFBF6FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F8',
  accentCard: brandColors.accentCard,
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E5E7EB',
  info: '#0F6BFFFF',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  onAccent: '#FFFFFF',
  onCard: '#FFFBF6FF',
};

export const darkColors: AppColors = {
  accent: brandColors.accent,
  secondary: brandColors.secondary,
  background: '#0C000BFF',
  surface: '#121A2E',
  surfaceAlt: '#0F172A',
  accentCard: brandColors.accentCard,
  text: '#F8FAFC',
  textMuted: '#A3B3CC',
  border: '#233150',
  info: '#0F6BFFFF',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  onAccent: '#1A1209',
  onCard: '#A3B3CC',
};

