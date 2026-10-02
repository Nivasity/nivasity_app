import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TextStyle } from 'react-native';

// Any Ionicons glyph
export type AppIconName = keyof typeof Ionicons.glyphMap;

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
