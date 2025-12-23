import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';

type CheckoutFabProps = {
  onPress: () => void;
  style?: ViewStyle;
};

const CheckoutFab: React.FC<CheckoutFabProps> = ({ onPress, style }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.secondary },
        style,
      ]}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Go to checkout"
    >
      <AppIcon name="wallet-outline" size={25} color={colors.onAccent} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 300,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default CheckoutFab;

