import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { AppColors } from './colors';

export const createNavigationTheme = (colors: AppColors, isDark: boolean): NavigationTheme => {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  };
};
