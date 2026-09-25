import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';

type CheckoutFabProps = {
  onPress: () => void;
  style?: ViewStyle;
  count?: number;
  total?: number;
  hiddenOffset?: number;
};

const formatMoney = (value: number) => `₦ ${Number(value || 0).toLocaleString()}`;

// A persistent docked bar, not a toast - it stays up for as long as the
// cart has items and only slides away once it's empty, so it's always
// there to tap rather than something you have to catch within a few
// seconds of adding an item.
const CheckoutFab: React.FC<CheckoutFabProps> = ({ onPress, style, count = 0, total = 0, hiddenOffset = 90 }) => {
  const { colors, isDark } = useTheme();
  const [rendered, setRendered] = useState(count > 0);
  const translateY = useRef(new Animated.Value(count > 0 ? 0 : hiddenOffset)).current;
  const opacity = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;
  const backgroundColor = isDark ? colors.accentMuted : colors.secondary;

  useEffect(() => {
    if (count > 0) {
      setRendered(true);
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
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: hiddenOffset,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [count, hiddenOffset, opacity, translateY]);

  if (!rendered) return null;

  return (
    <Animated.View
      pointerEvents={count > 0 ? 'auto' : 'none'}
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
        style={[styles.bar, { backgroundColor, borderColor: colors.border }]}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Go to checkout, ${count} item${count === 1 ? '' : 's'}`}
      >
        <View style={styles.left}>
          <View style={[styles.badge, { backgroundColor: colors.onAccent }]}>
            <Text style={[styles.badgeText, { color: backgroundColor }]}>{count}</Text>
          </View>
          <Text style={[styles.label, { color: colors.onAccent }]}>
            {count === 1 ? '1 item' : `${count} items`}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.total, { color: colors.onAccent }]}>{formatMoney(total)}</Text>
          <AppIcon name="chevron-forward" size={16} color={colors.onAccent} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
  total: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CheckoutFab;
