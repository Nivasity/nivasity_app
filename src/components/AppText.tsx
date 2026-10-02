import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

// Custom fonts ignore fontWeight on Android, so the weight picks the Geist file instead.
// 900 is capped at ExtraBold so headings never look too heavy (same as the web).
export const getFontFamily = (weight?: TextStyle['fontWeight']) => {
  const w = typeof weight === 'number' ? String(weight) : weight;
  switch (w) {
    case '800':
    case '900':
      return 'Geist-ExtraBold';
    case 'bold':
    case '700':
      return 'Geist-Bold';
    case '600':
      return 'Geist-SemiBold';
    case '500':
      return 'Geist-Medium';
    default:
      return 'Geist-Regular';
  }
};

const AppText: React.FC<TextProps> = ({ style, ...props }) => {
  const flattenedStyle = StyleSheet.flatten(style);
  const fontFamily = getFontFamily(flattenedStyle?.fontWeight);
  // fontWeight is dropped once the family encodes it, otherwise Android may fake-bold it again.
  return <Text {...props} style={[style, { fontFamily, fontWeight: undefined }]} />;
};

export default AppText;
