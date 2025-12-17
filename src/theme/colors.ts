export const brandColors = {
  accent: '#ff9100',
  secondary: '#7a3b73',
};

export type AppThemeMode = 'system' | 'light' | 'dark';

export type AppColors = {
  accent: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  onAccent: string;
};

export const lightColors: AppColors = {
  accent: brandColors.accent,
  secondary: brandColors.secondary,
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F8',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  onAccent: '#FFFFFF',
};

export const darkColors: AppColors = {
  accent: brandColors.accent,
  secondary: brandColors.secondary,
  background: '#0B1020',
  surface: '#121A2E',
  surfaceAlt: '#0F172A',
  text: '#F8FAFC',
  textMuted: '#A3B3CC',
  border: '#233150',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  onAccent: '#1A1209',
};

