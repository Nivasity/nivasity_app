import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';

type CheckoutFabProps = {
  onPress: () => void;
  style?: ViewStyle;
  trigger?: number;
  autoHideMs?: number;
  hiddenOffset?: number;
};

const CheckoutFab: React.FC<CheckoutFabProps> = ({
  onPress,
  style,
  trigger,
  autoHideMs = 5000,
  hiddenOffset = 90,
}) => {
  const { colors, isDark } = useTheme();
  const [hidden, setHidden] = useState(true);
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundColor = isDark ? colors.accentMuted : colors.secondary;

  const show = useCallback(() => {
    setHidden(false);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: hiddenOffset,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [hiddenOffset, opacity, translateY]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, autoHideMs);
  }, [autoHideMs, hide]);

  useEffect(() => {
    show();
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleHide, show, trigger]);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[
        {
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        style={[styles.button, { backgroundColor, borderColor: colors.border }]}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Go to checkout"
      >
        <AppIcon name="cart-outline" size={20} color={colors.onAccent} />
        <Text style={[styles.label, { color: colors.onAccent }]}>Checkout Now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CheckoutFab;
