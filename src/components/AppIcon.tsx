import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

export type AppIconName =
  | 'home-outline'
  | 'grid-outline'
  | 'person-outline'
  | 'search-outline'
  | 'arrow-forward'
  | 'receipt-outline'
  | 'time-outline'
  | 'wallet-outline'
  | 'school-outline'
  | 'people-outline'
  | 'cash-outline'
  | 'shield-checkmark-outline'
  | 'play'
  | 'heart-outline'
  | 'cube-outline'
  | 'cart-outline'
  | 'add'
  | 'sunny-outline'
  | 'moon-outline'
  | 'arrow-back'
  | 'eye-outline'
  | 'eye-off-outline'
  | 'sparkles-outline';

const glyphs: Record<AppIconName, string> = {
  'home-outline': '⌂',
  'grid-outline': '▦',
  'person-outline': '👤',
  'search-outline': '⌕',
  'arrow-forward': '→',
  'receipt-outline': '🧾',
  'time-outline': '⏱',
  'wallet-outline': '👛',
  'school-outline': '🎓',
  'people-outline': '👥',
  'cash-outline': '💵',
  'shield-checkmark-outline': '🛡',
  play: '▶',
  'heart-outline': '♡',
  'cube-outline': '⬚',
  'cart-outline': '🛒',
  add: '＋',
  'sunny-outline': '☀',
  'moon-outline': '☾',
  'arrow-back': '←',
  'eye-outline': '👁',
  'eye-off-outline': '🙈',
  'sparkles-outline': '✦',
};

export default function AppIcon({
  name,
  size = 16,
  color,
  style,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        styles.base,
        { fontSize: size, color },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {glyphs[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlign: 'center',
  },
});

