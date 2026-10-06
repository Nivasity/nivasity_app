import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Text from './AppText';
import AppIcon from './AppIcon';

// Floating "Ask Bella" button on the main tabs (Home, Store). Sits above the tab bar.
const BellaFab: React.FC<{ onPress: () => void; bottom?: number }> = ({ onPress, bottom = 16 }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.pill, { bottom }]}
    accessibilityRole="button"
    accessibilityLabel="Ask Bella, your Nivasity assistant"
  >
    <AppIcon name="sparkles" size={18} color="#fff" />
    <Text style={styles.label}>Ask Bella</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 11,
    paddingLeft: 14,
    paddingRight: 18,
    backgroundColor: '#7a3b73',
    borderWidth: 1,
    borderColor: 'rgba(255,145,0,0.6)',
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default BellaFab;
