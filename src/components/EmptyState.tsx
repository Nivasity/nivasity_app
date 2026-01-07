import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import AppIcon, { AppIconName } from './AppIcon';
import AppText from './AppText';
import { useTheme } from '../contexts/ThemeContext';

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  subtitle: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(spin, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    return () => {
      anim.stop();
      spin.setValue(0);
    };
  }, [spin]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[styles.card]}>
      <Animated.View style={[styles.iconWrap, { transform: [{ perspective: 800 }, { rotateY }] }]}>
        <AppIcon name={icon} size={32} color={colors.secondary} />
      </Animated.View>
      <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
      <AppText style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default EmptyState;
