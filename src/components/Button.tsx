import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import AppText from './AppText';
import AppIcon, { AppIconName } from './AppIcon';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'lg';
  icon?: AppIconName;
  style?: ViewStyle | ViewStyle[];
}

// Pill button with the "raised" look from the web portal: a darker bottom lip under solid
// colours that flattens when pressed. No drop shadows (see AGENTS.md).
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const solid =
    variant === 'primary'
      ? { bg: colors.accent, lip: colors.accentLip, fg: colors.onAccent }
      : variant === 'secondary'
        ? { bg: colors.secondary, lip: colors.secondaryLip, fg: '#FFFFFF' }
        : variant === 'danger'
          ? { bg: colors.danger, lip: '#A3262B', fg: '#FFFFFF' }
          : null;

  const fg = solid ? solid.fg : variant === 'outline' ? colors.text : colors.accent;
  const height = size === 'sm' ? 38 : size === 'lg' ? 56 : 50;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: height, paddingHorizontal: size === 'sm' ? 16 : 22 },
        solid && {
          backgroundColor: solid.bg,
          borderBottomWidth: pressed ? 1 : 3,
          borderBottomColor: solid.lip,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        variant === 'outline' && {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        },
        variant === 'ghost' && { backgroundColor: pressed ? colors.accentSoft : 'transparent' },
        disabled && styles.disabled,
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <AppIcon name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
          <AppText style={[styles.text, { color: fg, fontSize: size === 'sm' ? 14 : size === 'lg' ? 17 : 16 }]}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
  },
});

export default Button;
