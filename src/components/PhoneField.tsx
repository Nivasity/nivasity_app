import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';

const toFlagEmoji = (cca2: string) => {
  const upper = cca2.toUpperCase();
  if (upper.length !== 2) return '';
  const [a, b] = upper;
  return String.fromCodePoint(127397 + a.charCodeAt(0), 127397 + b.charCodeAt(0));
};

type PhoneFieldProps = {
  countryCca2: string;
  callingCode: string;
  phoneNumber: string;
  errorText?: string;
  onChangeCountry: (countryCca2: string, callingCode: string) => void;
  onChangePhoneNumber: (phoneNumber: string) => void;
};

const PhoneField: React.FC<PhoneFieldProps> = ({
  countryCca2,
  callingCode,
  phoneNumber,
  errorText,
  onChangeCountry,
  onChangePhoneNumber,
}) => {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const flag = useMemo(() => toFlagEmoji(countryCca2), [countryCca2]);

  const handleSelect = (country: Country) => {
    const cc = country.callingCode?.[0] ? `+${country.callingCode[0]}` : callingCode;
    onChangeCountry(country.cca2, cc);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.row}>
        <View style={{ flex: 0.38 }}>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Select country code"
          >
            <View pointerEvents="none">
              <Input
                label="Code"
                value={callingCode}
                editable={false}
                left={<PaperTextInput.Affix text={flag} />}
                right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
              />
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 0.62 }}>
          <Input
            label="Phone"
            value={phoneNumber}
            onChangeText={onChangePhoneNumber}
            keyboardType="phone-pad"
            errorText={errorText}
          />
        </View>
      </View>

      <CountryPicker
        countryCode={countryCca2 as CountryCode}
        renderFlagButton={() => null}
        withFilter
        withFlag
        withCallingCode
        withCallingCodeButton={false}
        withEmoji
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        theme={{
          backgroundColor: colors.surface,
          onBackgroundTextColor: colors.text,
          fontFamily: undefined,
          filterPlaceholderTextColor: colors.textMuted,
          activeOpacity: 0.85,
          itemHeight: 52,
          primaryColor: colors.secondary,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default PhoneField;
