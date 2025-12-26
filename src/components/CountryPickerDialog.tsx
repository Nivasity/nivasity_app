import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { useTheme } from '../contexts/ThemeContext';
import { getCountryOptions } from '../utils/country';

type CountryPickerDialogProps = {
  visible: boolean;
  selectedCca2: string;
  onClose: () => void;
  onSelect: (cca2: string, callingCode: string) => void;
};

const CountryPickerDialog: React.FC<CountryPickerDialogProps> = ({
  visible,
  selectedCca2,
  onClose,
  onSelect,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const normalizedQuery = query.trim().toLowerCase();
  const options = useMemo(() => getCountryOptions(), []);
  const filtered = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((c) => {
      const hay = `${c.name} ${c.cca2} ${c.callingCode}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [normalizedQuery, options]);

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
            <AppText style={[styles.title, { color: colors.text }]}>Select country</AppText>
          </View>

          <PaperTextInput
            mode="outlined"
            value={query}
            onChangeText={setQuery}
            placeholder="Search..."
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <AppText style={[styles.emptyText, { color: colors.textMuted }]}>No results</AppText>
              </View>
            ) : null}

            {filtered.map((c) => {
              const isSelected = (selectedCca2 || '').toUpperCase() === c.cca2;
              return (
                <TouchableOpacity
                  key={`${c.cca2}:${c.callingCode}`}
                  onPress={() => {
                    onSelect(c.cca2, c.callingCode);
                    onClose();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name} ${c.callingCode}`}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: isSelected ? colors.surfaceAlt : colors.surface,
                    },
                  ]}
                >
                  <View style={styles.optionLeft}>
                    <AppText style={[styles.flag, { color: colors.text }]}>{c.flag}</AppText>
                    <AppText style={[styles.optionLabel, { color: colors.text }]} numberOfLines={1}>
                      {c.name}
                    </AppText>
                  </View>
                  <AppText style={[styles.optionCode, { color: colors.textMuted }]} numberOfLines={1}>
                    {c.callingCode || ''}
                  </AppText>
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
  },
  searchContent: {
    height: 48,
  },
  optionRow: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  flag: {
    fontSize: 16,
    fontWeight: '900',
    width: 22,
    textAlign: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  optionCode: {
    fontSize: 12,
    fontWeight: '900',
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

export default CountryPickerDialog;

