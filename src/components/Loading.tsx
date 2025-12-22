import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppText from './AppText';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
      {message && <AppText style={[styles.message, { color: colors.textMuted }]}>{message}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default Loading;
