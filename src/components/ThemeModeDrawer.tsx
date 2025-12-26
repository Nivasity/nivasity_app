import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { AppThemeMode } from '../theme/colors';
import AppIcon from './AppIcon';

type ThemeModeDrawerProps = {
  visible: boolean;
  mode: AppThemeMode;
  onClose: () => void;
  onSelect: (mode: AppThemeMode) => void;
};

const ThemeRow = ({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: AppThemeMode;
  selected: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionRow,
        {
          backgroundColor: selected ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Theme ${label}`}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
          <AppIcon name={value === 'dark' ? 'moon-outline' : value === 'light' ? 'sunny-outline' : 'phone-portrait-outline'} size={18} color={colors.secondary} />
        </View>
        <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {selected ? <AppIcon name="checkmark" size={20} color={colors.secondary} /> : null}
    </TouchableOpacity>
  );
};

const ThemeModeDrawer: React.FC<ThemeModeDrawerProps> = ({ visible, mode, onClose, onSelect }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close theme selector"
        >
          <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
            ]}
          />
        </Pressable>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: 14 + insets.bottom,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
          </View>

          <ThemeRow
            label="System"
            value="system"
            selected={mode === 'system'}
            onPress={() => onSelect('system')}
          />
          <ThemeRow
            label="Light"
            value="light"
            selected={mode === 'light'}
            onPress={() => onSelect('light')}
          />
          <ThemeRow
            label="Dark"
            value="dark"
            selected={mode === 'dark'}
            onPress={() => onSelect('dark')}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  handle: {
    width: 46,
    height: 4,
    borderRadius: 99,
    opacity: 0.9,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  optionRow: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ThemeModeDrawer;

