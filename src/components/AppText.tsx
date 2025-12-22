import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

const getFontFamily = (weight?: TextStyle['fontWeight']) => {
  const normalizedWeight = typeof weight === 'number' ? String(weight) : weight;
  if (
    normalizedWeight === 'bold' ||
    normalizedWeight === '800' ||
    normalizedWeight === '900'
  ) {
    return 'SFProDisplay-Bold';
  }
  if (
    normalizedWeight === '500' ||
    normalizedWeight === '600' ||
    normalizedWeight === '700'
  ) {
    return 'SFProDisplay-Medium';
  }
  return 'SFProDisplay-Regular';
};

const AppText: React.FC<TextProps> = ({ style, ...props }) => {
  const flattenedStyle = StyleSheet.flatten(style);
  const fontFamily = getFontFamily(flattenedStyle?.fontWeight);
  return <Text {...props} style={[{ fontFamily }, style]} />;
};

export default AppText;
