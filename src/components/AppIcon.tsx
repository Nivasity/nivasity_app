import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TextStyle } from 'react-native';

export type AppIconName =
  | 'home-outline'
  | 'person-outline'
  | 'search-outline'
  | 'grid-outline'
  | 'arrow-forward'
  | 'chevron-forward'
  | 'logo-google'
  | 'checkmark'
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
  | 'sparkles-outline'
  | 'settings-outline'
  | 'location-outline'
  | 'link-outline'
  | 'help-circle-outline'
  | 'log-out-outline';

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
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
