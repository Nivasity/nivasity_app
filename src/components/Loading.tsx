import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ShimmerScreen } from './Shimmer';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={message}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ShimmerScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default Loading;
