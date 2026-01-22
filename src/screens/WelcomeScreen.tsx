import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { colors, toggle, isDark } = useTheme();
  const backgroundColor = isDark ? colors.background : colors.accent;
  const foregroundColor = '#FFFFFF';
  const logoSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(logoSpin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => {
      anim.stop();
      logoSpin.setValue(0);
    };
  }, [logoSpin]);

  const rotateY = logoSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <Animated.Image
            source={require('../../assets/logo.png')}
            style={[
              styles.logo,
              { transform: [{ perspective: 800 }, { rotateY }] },
              !isDark && { tintColor: foregroundColor }
            ]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.copy}>
          <AppText style={[styles.headline, { color: foregroundColor }]}>
            Stress-Free{'\n'}Student Shopping
          </AppText>
          <AppText style={[styles.subhead, { color: 'rgba(255,255,255,0.82)' }]}>
            Browse course materials and checkout securely—anytime, anywhere.
          </AppText>
        </View>

        <View style={styles.bottom}>
          <View style={styles.bottomRow}>
            <TouchableOpacity
              onPress={toggle}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
              style={styles.roundButton}
              activeOpacity={0.85}
            >
              <AppIcon
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={foregroundColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Explore now"
              style={styles.cta}
              activeOpacity={0.9}
            >
              <View style={styles.ctaLeft}>
                <View style={styles.ctaBadge}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={[styles.ctaBadgeIcon]}
                    resizeMode="contain"
                  />
                </View>
                <AppText style={styles.ctaText}>Explore Now</AppText>
              </View>
              <AppIcon name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    justifyContent: 'flex-end',
    gap: 84,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 130,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 14,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  bottom: {
    width: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cta: {
    flex: 1,
    height: 54,
    borderRadius: 28,
    outlineColor: '#FFFFFF',
    outlineWidth: 0.25,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.70)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ctaBadgeIcon: {
    width: 18,
    height: 18,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  linkWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    textAlign: 'center',
  },
  linkStrong: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default WelcomeScreen;
