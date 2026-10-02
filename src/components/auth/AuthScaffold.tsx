import React, { ReactNode } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../AppIcon';
import AppText from '../AppText';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthScaffold({
  navigation,
  title,
  children,
  scrollable = false,
  cardStyle,
}: {
  navigation: any;
  title: string;
  children: ReactNode;
  scrollable?: boolean;
  cardStyle?: ViewStyle;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Welcome');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ImageBackground
        source={require('../../../assets/auth_background.jpg')}
        style={styles.background}
        resizeMode="cover"
        blurRadius={10}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'transparent',
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            activeOpacity={0.85}
          >
            <AppIcon name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={[styles.sheetWrap, { paddingBottom: 14 + insets.bottom }]}>
            <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip }, cardStyle]}>
              <Image source={require('../../../assets/image.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Nivasity" />
              <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
              {scrollable ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              ) : (
                <View>{children}</View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
  },
  logo: {
    width: 120,
    height: 34,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 20,
  },
});
