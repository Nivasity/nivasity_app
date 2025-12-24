import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { HelperText } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  errorText?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

const digitsOnly = (text: string) => text.replace(/[^\d]/g, '');

const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  errorText,
  autoFocus,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const code = useMemo(() => digitsOnly(value).slice(0, length), [value, length]);
  const cells = useMemo(() => {
    const arr = Array.from({ length }, (_, i) => code[i] || '');
    return arr;
  }, [code, length]);

  const setAt = (index: number, digit: string) => {
    const next = cells.slice();
    next[index] = digit;
    onChange(next.join(''));
  };

  const focusIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputs.current[clamped]?.focus?.();
  };

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {cells.map((cell, index) => {
          const isFocused = focusedIndex === index;
          return (
            <TextInput
              key={index}
              ref={(r) => {
                inputs.current[index] = r;
              }}
              value={cell}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((prev) => (prev === index ? null : prev))}
              onChangeText={(text) => {
                if (disabled) return;
                const digits = digitsOnly(text);
                if (digits.length === 0) {
                  setAt(index, '');
                  return;
                }

                if (digits.length === 1) {
                  setAt(index, digits);
                  if (index < length - 1) focusIndex(index + 1);
                  return;
                }

                const slice = digits.slice(0, length - index).split('');
                const next = cells.slice();
                for (let i = 0; i < slice.length; i++) next[index + i] = slice[i];
                onChange(next.join(''));
                focusIndex(index + slice.length);
              }}
              onKeyPress={({ nativeEvent }) => {
                if (disabled) return;
                if (nativeEvent.key === 'Backspace' && !cells[index] && index > 0) {
                  focusIndex(index - 1);
                }
              }}
              editable={!disabled}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={length}
              autoFocus={autoFocus && index === 0}
              style={[
                styles.cell,
                {
                  borderColor: isFocused ? colors.secondary : colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.secondary}
              cursorColor={colors.secondary}
              accessible
              accessibilityLabel={`OTP digit ${index + 1}`}
            />
          );
        })}
      </View>

      {errorText ? (
        <HelperText type="error" visible style={styles.helper}>
          {errorText}
        </HelperText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cell: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 0,
  },
  helper: {
    marginTop: -2,
  },
});

export default OtpInput;
