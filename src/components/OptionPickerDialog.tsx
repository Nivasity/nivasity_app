import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { TextInput as PaperTextInput } from 'react-native-paper';
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
  searchEnabled?: boolean;
  searchPlaceholder?: string;
};

const OptionPickerDialog: React.FC<OptionPickerDialogProps> = ({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
  searchEnabled,
  searchPlaceholder,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const normalizedQuery = query.trim().toLowerCase();
  const shouldShowSearch = searchEnabled ?? options.length > 8;
  const filteredOptions = useMemo(() => {
    if (!shouldShowSearch || normalizedQuery.length === 0) return options;
    return options.filter((value) => value.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, options, shouldShowSearch]);

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
          {shouldShowSearch ? (
            <PaperTextInput
              mode="outlined"
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder || 'Search...'}
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="search"
              returnKeyType="search"
              style={[styles.searchInput, { backgroundColor: colors.surface }]}
              outlineStyle={styles.searchOutline}
              contentStyle={styles.searchContent}
              textColor={colors.text}
              placeholderTextColor={colors.textMuted}
              outlineColor={colors.border}
              activeOutlineColor={colors.secondary}
              selectionColor={colors.secondary}
              cursorColor={colors.secondary}
              left={<PaperTextInput.Icon icon="magnify" color={colors.textMuted} />}
              right={
                query ? (
                  <PaperTextInput.Icon
                    icon="close"
                    onPress={() => setQuery('')}
                    color={colors.textMuted}
                    forceTextInputFocus={false}
                  />
                ) : undefined
              }
            />
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredOptions.length === 0 ? (
              <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <AppText style={[styles.emptyText, { color: colors.textMuted }]}>No results</AppText>
              </View>
            ) : null}

            {filteredOptions.map((value) => {
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
                      borderColor: isSelected ? colors.secondary : colors.border,
                      backgroundColor: isSelected ? colors.secondary : colors.surface,
                    },
                  ]}
                >
                  <AppText style={[styles.optionLabel, { color: isSelected ? colors.surface : colors.text }]} numberOfLines={1}>
                    {value}
                  </AppText>
                  {isSelected ? (
                    <AppIcon name="checkmark" size={20} color={colors.surface} />
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
  searchInput: {
    marginBottom: 12,
  },
  searchOutline: {
    borderRadius: 18,
    borderWidth: 1,
  },
  searchContent: {
    height: 48,
  },
  optionRow: {
    height: 45,
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
  empty: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default OptionPickerDialog;
