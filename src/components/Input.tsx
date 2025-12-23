import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  HelperText,
  TextInput as PaperTextInput,
  TextInputProps as PaperTextInputProps,
} from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

type InputProps = Omit<PaperTextInputProps, 'mode' | 'error'> & {
  errorText?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
};

const Input: React.FC<InputProps> = ({
  errorText,
  containerStyle,
  isPassword = false,
  ...props
}) => {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const showPassword = isPassword && isPasswordVisible;
  const secureTextEntry = isPassword && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      <PaperTextInput
        mode="outlined"
        {...props}
        secureTextEntry={secureTextEntry}
        outlineStyle={styles.outline}
        style={[styles.input, { backgroundColor: colors.background }, props.style]}
        textColor={colors.text}
        placeholderTextColor={colors.textMuted}
        outlineColor={colors.border}
        activeOutlineColor={colors.secondary}
        selectionColor={colors.secondary}
        cursorColor={colors.secondary}
        error={Boolean(errorText)}
        right={
          isPassword ? (
            <PaperTextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setIsPasswordVisible((v) => !v)}
              color={colors.textMuted}
              forceTextInputFocus={false}
            />
          ) : (
            props.right
          )
        }
      />
      {errorText ? (
        <HelperText type="error" visible style={styles.helper}>
          {errorText}
        </HelperText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  input: {
    minHeight: 60,
  },
  outline: {
    borderRadius: 20,
  },
  helper: {
    marginTop: -2,
  },
});

export default Input;
