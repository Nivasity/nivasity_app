import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AppIcon from './AppIcon';
import AppText from './AppText';
import { useTheme } from '../contexts/ThemeContext';

type OptionPickerDialogProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

const OptionPickerDialog: React.FC<OptionPickerDialogProps> = ({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
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
            <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((value) => {
              const isSelected = selected === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    onSelect(value);
                    onClose();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={value}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: isSelected ? colors.surfaceAlt : colors.surface,
                    },
                  ]}
                >
                  <AppText style={[styles.optionLabel, { color: colors.text }]} numberOfLines={1}>
                    {value}
                  </AppText>
                  {isSelected ? (
                    <AppIcon name="checkmark" size={20} color={colors.secondary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxHeight: '72%',
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
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  optionRow: {
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    marginEnd: 10,
  },
});

export default OptionPickerDialog;
