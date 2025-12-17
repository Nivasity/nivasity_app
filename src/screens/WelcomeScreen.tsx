import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { colors, toggle, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          style={[styles.themeButton, { backgroundColor: colors.surface }]}
        >
          <AppIcon
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <View style={[styles.illustrationCard, { backgroundColor: colors.surface }]}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Empowering{'\n'}You with{'\n'}
          <Text style={{ color: colors.accent }}>Knowledge</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Unlock knowledge anytime, anywhere with engaging content built for students.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Get Started" onPress={() => navigation.navigate('Login')} />
        <View style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.textMuted }]}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.linkAction, { color: colors.secondary }]}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 10,
  },
  illustrationCard: {
    height: 240,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  illustration: {
    width: '72%',
    height: '72%',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  actions: {
    paddingBottom: 22,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  linkText: {
    fontSize: 14,
  },
  linkAction: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WelcomeScreen;
