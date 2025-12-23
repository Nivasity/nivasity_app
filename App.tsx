import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAppFonts } from './src/theme/useAppFonts';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CartProvider } from './src/contexts/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';


export default function App() {
  const [fontsLoaded] = useAppFonts();
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoot />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const AppRoot = () => {
  const { isDark, colors } = useTheme();
  const paperTheme = React.useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        secondary: colors.secondary,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceAlt,
        outline: colors.border,
        error: colors.danger,
        onSurface: colors.text,
      },
    };
  }, [isDark, colors]);
  return (
    <PaperProvider theme={paperTheme}>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </PaperProvider>
  );
};
